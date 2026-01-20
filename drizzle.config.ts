import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

function checkEnv(name: string) {
    const x = process.env[name];

    if (!x) {
        const message = `ENV: ${name} is not set`;

        throw new Error(message);
    }

    return x;
}

export default defineConfig({
    dbCredentials: {
        database: checkEnv("POSTGRES_DB"),
        host: checkEnv("DB_HOST"),
        password: checkEnv("POSTGRES_PASSWORD"),
        port: Number(checkEnv("DB_PORT")),
        ssl: false,
        user: checkEnv("POSTGRES_USER"),
    },
    dialect: 'postgresql',
    out: './drizzle',
    schema: './src/db/schema.ts',
    strict: true,
});
