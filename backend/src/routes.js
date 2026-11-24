import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
const router = Router();
const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
router.post('/auth/register', async (req, res, next) => {
  const { name, email, password, organization } = req.body;
  if (!name || !email || !password || !organization) return res.status(400).json({ message: 'Name, email, password and company are required' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const org = await client.query('INSERT INTO organizations(name) VALUES($1) RETURNING id, name', [organization]);
    const hash = await bcrypt.hash(password, 10);
    const user = await client.query(
      'INSERT INTO users(organization_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role,organization_id',
      [org.rows[0].id, name, email.toLowerCase(), hash, 'admin']
    );
    await client.query('COMMIT');
    const token = jwt.sign({ id: user.rows[0].id, organizationId: org.rows[0].id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, user: user.rows[0], organization: org.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ message: 'Email already registered' });
    next(error);
  } finally { client.release(); }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [(email || '').toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) return res.status(401).json({ message: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, organizationId: user.organization_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, organization_id: user.organization_id } });
  } catch (error) { next(error); }
});

router.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'NexusOS API' });
});

router.use(requireAuth);

router.get('/dashboard', async (req, res, next) => {
  try {
    const org = req.user.organizationId;
    const [projects, tasks, tickets, money] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM projects WHERE organization_id=$1', [org]),
      pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='Done')::int AS completed FROM tasks WHERE organization_id=$1", [org]),
      pool.query("SELECT COUNT(*)::int AS total FROM tickets WHERE organization_id=$1 AND status <> 'Resolved'", [org]),
      pool.query("SELECT COALESCE(SUM(amount) FILTER (WHERE type='Income'),0) AS income, COALESCE(SUM(amount) FILTER (WHERE type='Expense'),0) AS expense FROM transactions WHERE organization_id=$1", [org])
    ]);
    res.json({ projects: projects.rows[0].total, tasks: tasks.rows[0], openTickets: tickets.rows[0].total, finance: money.rows[0] });
  } catch (error) { next(error); }
});

const resources = [
  { path: 'projects', table: 'projects', fields: ['name','description','status','due_date'], required: ['name'] },
  { path: 'tasks', table: 'tasks', fields: ['project_id','title','assignee','status','due_date'], required: ['title'] },
  { path: 'tickets', table: 'tickets', fields: ['subject','customer','priority','status'], required: ['subject'] },
  { path: 'transactions', table: 'transactions', fields: ['title','category','type','amount','transaction_date'], required: ['title','type','amount'] }
];

for (const resource of resources) {
  router.get(`/${resource.path}`, async (req, res, next) => {
    try {
      const result = await pool.query(`SELECT * FROM ${resource.table} WHERE organization_id=$1 ORDER BY created_at DESC`, [req.user.organizationId]);
      res.json(result.rows);
    } catch (error) { next(error); }
  });

  router.post(`/${resource.path}`, async (req, res, next) => {
    try {
      for (const field of resource.required) if (req.body[field] === undefined || req.body[field] === '') return res.status(400).json({ message: `${field} is required` });
      const values = resource.fields.map(field => req.body[field] ?? null);
      const columns = ['organization_id', ...resource.fields];
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const result = await pool.query(
        `INSERT INTO ${resource.table} (${columns.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        [req.user.organizationId, ...values]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) { next(error); }
  });
}

router.patch('/tasks/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await pool.query('UPDATE tasks SET status=$1 WHERE id=$2 AND organization_id=$3 RETURNING *', [status, req.params.id, req.user.organizationId]);
    if (!result.rowCount) return res.status(404).json({ message: 'Task not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

router.patch('/tickets/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await pool.query('UPDATE tickets SET status=$1 WHERE id=$2 AND organization_id=$3 RETURNING *', [status, req.params.id, req.user.organizationId]);
    if (!result.rowCount) return res.status(404).json({ message: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

// List organization files
router.get('/files', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE organization_id=$1 ORDER BY created_at DESC',
      [req.user.organizationId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Generate secure S3 upload URL
router.post('/files/upload-url', async (req, res, next) => {
  try {
    const { fileName, contentType, sizeBytes } = req.body;

    if (!fileName || !contentType || !sizeBytes) {
      return res.status(400).json({
        message: 'File name, type and size are required'
      });
    }

    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        message: 'Only PDF, JPG, PNG and TXT files are allowed'
      });
    }

    if (sizeBytes > MAX_FILE_SIZE || sizeBytes <= 0) {
      return res.status(400).json({
        message: 'Maximum file size is 10 MB'
      });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const key = `${req.user.organizationId}/${crypto.randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300
    });

    res.json({
      uploadUrl,
      key,
      fileName,
      contentType
    });
  } catch (error) {
    next(error);
  }
});

// Confirm upload and save file information
router.post('/files/complete', async (req, res, next) => {
  try {
    const { key, fileName } = req.body;

    if (!key || !fileName ||
        !key.startsWith(`${req.user.organizationId}/`)) {
      return res.status(400).json({
        message: 'Invalid file information'
      });
    }

    const object = await s3.send(new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }));

    if (!allowedTypes.includes(object.ContentType) ||
        !object.ContentLength ||
        object.ContentLength > MAX_FILE_SIZE) {
      return res.status(400).json({
        message: 'Uploaded file is invalid'
      });
    }

    const saved = await pool.query(
      `INSERT INTO files
       (organization_id, name, storage_key, content_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.organizationId,
        fileName,
        key,
        object.ContentType,
        object.ContentLength
      ]
    );

    res.status(201).json(saved.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete file from S3 and database
router.delete('/files/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE id=$1 AND organization_id=$2',
      [req.params.id, req.user.organizationId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    const file = result.rows[0];

    if (file.storage_key) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: file.storage_key
      }));
    }

    await pool.query(
      'DELETE FROM files WHERE id=$1 AND organization_id=$2',
      [req.params.id, req.user.organizationId]
    );

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
