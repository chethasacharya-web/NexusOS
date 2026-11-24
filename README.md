# NexusOS — Business Operations Dashboard

A small, portfolio-ready full-stack SaaS-style application built with React, JavaScript, Context API, Express, PostgreSQL, JWT authentication, Docker and GitHub Actions.

## Included features

- Register a company workspace and its first admin account
- Login with bcrypt password hashing and JWT authentication
- Protected REST API routes
- Workspace dashboard with project and task counts
- Create and list projects
- Create and update tasks
- Create and update customer support tickets
- Record and list income/expense transactions
- Basic file metadata listing and upload-ready S3 integration hook
- Organization-scoped data access
- Docker Compose for local development
- GitHub Actions CI (backend tests + frontend build + Docker image build)
- Optional GitHub Actions deployment to an AWS EC2 instance over SSH

> This is an MVP portfolio project, not production-ready financial or enterprise software. Before real business use, add stronger validation, refresh-token/session management, rate limiting, audit coverage, backups, monitoring, and security review.

## Requirements

- Node.js 20+
- Docker Desktop (recommended)
- Git

## Run locally (recommended)

1. Extract the ZIP and open the `NexusOS` folder in VS Code.
2. Copy `.env.example` to `.env`.
3. Start the app:

```bash
docker compose up --build
```

4. Open:
   - Frontend: http://localhost:5173
   - Backend health: http://localhost:5000/api/health

Register a workspace from the app. Registration creates an organization and an admin user.

To stop:

```bash
docker compose down
```

To reset the local database (deletes local data):

```bash
docker compose down -v
docker compose up --build
```

## Run without Docker

Start PostgreSQL separately, create a database named `nexusos`, then:

### Backend

```bash
cd backend
cp ../.env.example .env
npm install
npm run dev
```

### Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

For a local non-Docker setup, set `DATABASE_URL` in `backend/.env` to your PostgreSQL connection string. Set `VITE_API_URL=http://localhost:5000/api` in `frontend/.env`.

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create organization + admin |
| POST | `/api/auth/login` | Login |
| GET | `/api/dashboard` | Dashboard summary |
| GET/POST | `/api/projects` | List/create projects |
| GET/POST | `/api/tasks` | List/create tasks |
| PATCH | `/api/tasks/:id` | Update task status |
| GET/POST | `/api/tickets` | List/create tickets |
| PATCH | `/api/tickets/:id` | Update ticket status |
| GET/POST | `/api/transactions` | List/create transactions |
| GET | `/api/files` | List file records |

All routes except `/api/health` and auth routes require `Authorization: Bearer <token>`.

## AWS S3 integration

The MVP stores file records in PostgreSQL. To enable actual S3 uploads, configure these backend environment variables:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`

The backend includes an endpoint that creates a short-lived presigned upload URL. The browser can upload directly to S3 using that URL. Use an IAM user/role restricted to the single bucket. Never put AWS credentials in frontend environment variables.

## CI/CD

The workflow at `.github/workflows/ci-cd.yml` runs on pushes and pull requests:
- Installs dependencies
- Runs backend tests
- Builds the React frontend
- Builds backend and frontend Docker images

### Optional EC2 deployment

1. Launch an Ubuntu EC2 instance and install Docker + Docker Compose plugin.
2. Clone this repository on the instance into `/opt/nexusos`.
3. Ensure the instance can access PostgreSQL (for a simple demo, the Compose database can run on the same EC2 instance).
4. Add these GitHub repository secrets:
   - `EC2_HOST` — public IPv4 or DNS
   - `EC2_USER` — usually `ubuntu`
   - `EC2_SSH_KEY` — private SSH key contents
5. Uncomment the deployment job in `.github/workflows/ci-cd.yml` and follow its comments. Configure `.env` on EC2 separately; do not commit it.

For a resume, describe deployment only after you have actually deployed it.

## Suggested resume description

**NexusOS | React, Node.js, Express, PostgreSQL, JWT, Docker, GitHub Actions, AWS S3**
- Built a multi-module business operations dashboard with organization-scoped project, task, support ticket and expense workflows.
- Developed REST APIs using Express and PostgreSQL, with JWT authentication, bcrypt password hashing and protected routes.
- Containerized the application with Docker Compose and configured GitHub Actions for automated testing and frontend/Docker build validation.
- Added an AWS S3 presigned-upload integration path for secure browser-to-cloud file uploads.

Only retain AWS S3 and deployment claims after configuring and testing them.
