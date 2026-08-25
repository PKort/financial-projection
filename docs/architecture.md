# Architecture

## Components

### Frontend

The React application lives in `frontend/src`. `App.tsx` coordinates the main financial views, while reusable UI, authentication, administration, analytics and user-setting components are grouped under `frontend/src/components`.

The frontend communicates with relative `/api` URLs. In production and in the supplied Docker setup, Nginx routes those calls to the backend. Authentication tokens are stored in browser local storage and attached to API requests by `frontend/src/api/client.ts`.

### Backend

The NestJS application lives in `backend` and exposes three controller areas:

- `/api/auth` for login, sessions, profile and password management;
- `/api/admin/users` for administrator-only user management;
- `/api` for accounts, transactions, recurring templates, categories, settings and projections.

`ProjectionService` contains financial validation and projection calculations. `AuthService` owns authentication, password hashing, sessions and user-profile operations.

### Database and tenant isolation

Prisma models are defined in `backend/prisma/schema.prisma`. Most financial tables contain a `userId`. After authentication, `TenantInterceptor` places the current user ID in an asynchronous tenant context. `PrismaService` uses that context to scope supported data operations.

This isolation is part of the security boundary. New financial models and Prisma operations must be reviewed to ensure they cannot access another user's records.

## Important data flows

### Authentication

1. The client posts credentials to `/api/auth/login`.
2. The backend validates the bcrypt password hash.
3. A random session token is returned; only its SHA-256 hash is stored in the database.
4. The client sends the token as `Authorization: Bearer …`.
5. Password changes and account deactivation invalidate relevant sessions.

### Projection generation

1. The client requests `/api/projection` with start and end dates.
2. The backend loads accounts, transactions, settings and recurring templates for the current user.
3. Recurring and automatic repayment entries are generated or updated.
4. The service calculates per-account and total balances for the projection timeline.
5. The response includes the timeline and daily-budget summary.

### Internationalization

Polish and English UI strings are managed by `frontend/src/i18n/I18nProvider.tsx`. The locale is stored locally for the login screen and in the authenticated user's `ui_locale` setting. User-created names and descriptions are not translated.

## Schema changes

Every database change should include:

1. an update to `backend/prisma/schema.prisma`;
2. a generated migration under `backend/prisma/migrations`;
3. regeneration of Prisma Client;
4. successful backend compilation;
5. migration and rollback-risk notes in the pull request.
