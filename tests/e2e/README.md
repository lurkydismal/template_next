# End-to-end tests

The Playwright suite expects a dedicated, disposable test database. Do not point it at production or a developer database containing valuable data.

1. Create a PostgreSQL database with the application schema migrated (`pnpm db:migrate`).
2. Start the app with a test `.env` that points only at that database and sets `AUTH_DISABLE_SIGN_UP=false` if you need to register the test user.
3. Create a test account through `/auth/register`, or seed a known test account in the test database.
4. Export the test credentials and run the suite:

```bash
export E2E_USER_EMAIL='e2e@example.test'
export E2E_USER_PASSWORD='a-long-test-only-password'
pnpm test:e2e
```

`E2E_BASE_URL` can point Playwright at an already-running test deployment. When it is omitted, Playwright starts `pnpm dev` on `http://127.0.0.1:3000`.

The anonymous-access test does not need credentials. The authenticated workflow creates and updates rows in the configured test database and therefore leaves test records behind. Use a fresh disposable database or clean it between runs.
