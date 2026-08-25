# Contributing

Thank you for considering a contribution.

## Development workflow

1. Create a focused branch from the current default branch.
2. Install dependencies in `backend` and `frontend`.
3. Make a small, reviewable change.
4. Update documentation and migrations when relevant.
5. Build both applications before opening a pull request:

   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```

6. Open a pull request using the repository template.

## Commit and pull-request guidance

- Use short, imperative commit subjects, for example `Add user profile settings`.
- Keep unrelated refactors out of feature and bug-fix changes.
- Describe user-visible behavior, validation and migration impact.
- Include screenshots for UI changes.
- Never commit credentials, `.env` files, tokens or personal financial data.

## Database changes

Update `backend/prisma/schema.prisma` and create a named development migration:

```bash
cd backend
npx prisma migrate dev --name descriptive_change_name
npx prisma generate
```

Do not edit an already deployed migration. Add a new corrective migration instead.

## Internationalization

All new interface text should be added to the translation mechanism in `frontend/src/i18n`. Preserve user-entered text exactly as provided. Use stable codes rather than localized database labels for system behavior.

## Reporting issues

Use the provided GitHub issue forms for reproducible bugs and feature proposals. Security vulnerabilities must follow [SECURITY.md](SECURITY.md).
