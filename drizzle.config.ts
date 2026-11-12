import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

function requiredEnv(name: string): string {
    const directValue = process.env[name];

    if (directValue !== undefined && directValue !== "") {
        return directValue;
    }

    const filePath = process.env[`${name}_FILE`];

    if (filePath) {
        let fileValue: string;

        try {
            fileValue = readFileSync(filePath, "utf8").replace(/\r?\n$/, "");
        } catch {
            throw new Error(`Unable to read environment file configured by ${name}_FILE`);
        }

        if (fileValue.length === 0) {
            throw new Error(`Environment file configured by ${name}_FILE is empty`);
        }

        return fileValue;
    }

    throw new Error(`Missing required environment variable: ${name}`);
}

const port = Number(process.env.DB_PORT ?? "5432");

if (!Number.isSafeInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535");
}

// drizzle-kit forces TLS for host/user/password credentials unless `ssl` is given, which breaks
// the bundled PostgreSQL container (no TLS on the private network). Default to disabled.
const dbSsl = process.env.DB_SSL?.trim() || "disable";

if (!["disable", "require", "verify-full"].includes(dbSsl)) {
    throw new Error('DB_SSL must be "disable", "require" or "verify-full"');
}

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    migrations: {
        // The application role is explicitly granted CREATE on public.
        schema: "public",
    },
    dbCredentials: {
        host: requiredEnv("DB_HOST"),
        port,
        user: requiredEnv("POSTGRES_USER"),
        password: requiredEnv("POSTGRES_PASSWORD"),
        database: requiredEnv("POSTGRES_DB"),
        ssl: dbSsl === "disable" ? false : (dbSsl as "require" | "verify-full"),
    },
    verbose: true,
});
