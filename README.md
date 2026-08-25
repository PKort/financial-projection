# Financial Projection

Web application for managing personal finances and projecting account balances. It supports accounts, transactions, transfers, recurring payments, expense categories, daily-budget calculations, multiple users and Polish/English UI.

> The project is under active development. Before exposing an instance publicly, review the security notes and replace all example credentials.

## Table of contents

- [Features](#features)
- [Technology](#technology)
- [Architecture](#architecture)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development](#local-development)
- [Database migrations](#database-migrations)
- [Database seed](#database-seed)
- [Administrator password](#administrator-password)
- [Configuration](#configuration)
- [Useful commands](#useful-commands)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Features

- balance projections for a selected date range;
- regular transactions and transfers between accounts;
- recurring transaction templates;
- checking, savings and credit-card accounts;
- automatic credit-card repayment projections;
- expense groups and subgroups;
- daily budget and salary-date calculations;
- financial summaries and analytics;
- isolated financial data for each user;
- administrator panel for managing user access;
- user profile, language and password settings;
- Polish and English UI;
- installable Progressive Web App shell.

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | NestJS 10, TypeScript |
| Data access | Prisma 5 |
| Database | MariaDB/MySQL |
| Authentication | Bearer sessions, bcrypt password hashing |
| Deployment | Docker, Docker Compose, Nginx |

## Architecture

```text
Browser
   │
   ▼
Nginx reverse proxy
   ├── /      → React frontend
   └── /api/* → NestJS backend
                    │
                    ▼
                Prisma ORM
                    │
                    ▼
              MariaDB / MySQL
```

Authenticated requests carry a bearer token. Financial records are associated with a user, and the backend tenant context restricts Prisma operations to the current user.

More detail is available in [docs/architecture.md](docs/architecture.md).

## Quick start with Docker

### Requirements

- Docker Engine;
- Docker Compose v2;
- an available port for the reverse proxy (the example uses `8080`).

### 1. Prepare configuration

```bash
cp .env.example .env
cp docker-compose.yml.example docker-compose.yml
```

Replace every example password in `.env` before starting the stack. Do not commit `.env`.

### 2. Build and start the database

```bash
docker compose build
docker compose up -d db
```

Wait until MariaDB accepts connections, then start the backend and apply migrations:

```bash
docker compose up -d backend
docker compose exec backend npx prisma migrate deploy
```

### 3. Start the remaining services

```bash
docker compose up -d frontend dev-proxy
```

Open <http://localhost:8080>.

To inspect service status and logs:

```bash
docker compose ps
docker compose logs -f backend
```

## Local development

### Requirements

- Node.js 20 or newer;
- npm;
- MariaDB or MySQL;
- a valid `DATABASE_URL`.

### Backend

```bash
cd backend
npm install
export DATABASE_URL='mysql://app_user:user_password@127.0.0.1:3306/app_db'
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

The backend listens on port `3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

In local development, `/api` must be routed to the backend. You can enable the proxy configuration in `frontend/vite.config.ts` or run the provided Nginx proxy through Docker.

## Database migrations

Migration files are stored in [`backend/prisma/migrations`](backend/prisma/migrations).

Apply committed migrations in deployments and shared environments:

```bash
cd backend
npx prisma migrate deploy
```

Check migration status:

```bash
npx prisma migrate status
```

Create a migration while developing a schema change:

```bash
npx prisma migrate dev --name descriptive_change_name
```

Commit both `schema.prisma` and the generated migration directory. Back up production data before applying migrations. Do not use `migrate dev` against production.

## Database seed

To populate development dictionaries and example data:

```bash
cd backend
npm run db:seed
```

The current seed creates example users with the password `12345678`. This is intended only for local development. Never expose a seeded instance until every default password has been replaced.

## Administrator password

Set a chosen administrator password:

```bash
cd backend
ADMIN_USERNAME=admin \
ADMIN_RESET_PASSWORD='replace-with-a-long-random-password' \
npm run admin:reset-password
```

Generate a random administrator password:

```bash
cd backend
npm run admin:reset-password:random
```

Changing an administrator password invalidates all of that user's active sessions.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Backend | Prisma connection string, e.g. `mysql://user:password@host:3306/database` |
| `DB_HOST` | Docker Compose | Database service hostname |
| `DB_PORT` | Docker Compose | Database port |
| `DB_ROOT_PASSWORD` | Docker Compose | MariaDB root password |
| `DB_NAME` | Docker Compose | Application database name |
| `DB_USER` | Docker Compose | Application database user |
| `DB_PASSWORD` | Docker Compose | Application database password |
| `ADMIN_USERNAME` | Password reset | Administrator login; defaults to `admin` |
| `ADMIN_RESET_PASSWORD` | Password reset | New administrator password, at least eight characters |

## Useful commands

| Purpose | Command |
| --- | --- |
| Build backend | `cd backend && npm run build` |
| Run backend in development | `cd backend && npm run start:dev` |
| Build frontend | `cd frontend && npm run build` |
| Run frontend in development | `cd frontend && npm run dev` |
| Generate Prisma Client | `cd backend && npx prisma generate` |
| Apply migrations | `cd backend && npx prisma migrate deploy` |
| Seed development data | `cd backend && npm run db:seed` |
| Rebuild Docker stack | `./bounce.sh` |

The repository currently has build-time TypeScript validation but no automated test suite. Changes should at minimum pass both frontend and backend builds.

## Security

- Do not commit `.env`, database dumps, bearer tokens or passwords.
- Replace the example database credentials and seeded passwords.
- Restrict CORS and add TLS before public deployment.
- Back up the database and test restoration regularly.
- Report vulnerabilities according to [SECURITY.md](SECURITY.md), not through a public issue.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development and pull-request workflow. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Distributed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
