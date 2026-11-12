/**
 * Database configuration for PostgreSQL using Drizzle ORM.
 *
 * - Loads environment variables from .env (development only; production injects them).
 * - Reads the password through `POSTGRES_PASSWORD` or `POSTGRES_PASSWORD_FILE`.
 * - Uses a bounded pool with connection/idle/statement timeouts.
 * - Exports the Drizzle instance (default) and the raw pool (for health probes and shutdown).
 */
import "dotenv/config";
import { DefaultLogger, LogWriter } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { dbSslOption, readDbSsl, readIntEnv, requireEnv } from "@/lib/env";
import log from "@/utils/stdlog";

import { relations } from "./relations";

// Routes Drizzle query logs through the shared logger at debug level.
class MyLogWriter implements LogWriter {
    write(message: string) {
        log.debug(message);
    }
}

const logger = new DefaultLogger({ writer: new MyLogWriter() });

declare global {
    var __dbPool: Pool | undefined;
}

function createPool(): Pool {
    const port = readIntEnv("DB_PORT", 5432, { min: 1, max: 65_535 });

    const pool = new Pool({
        user: requireEnv("POSTGRES_USER"),
        password: requireEnv("POSTGRES_PASSWORD"),
        database: requireEnv("POSTGRES_DB"),
        host: requireEnv("DB_HOST"),
        port,
        ssl: dbSslOption(readDbSsl()),
        max: readIntEnv("DB_POOL_MAX", 10, { min: 1, max: 200 }),
        connectionTimeoutMillis: readIntEnv("DB_CONNECTION_TIMEOUT_MS", 5_000, { min: 100 }),
        idleTimeoutMillis: readIntEnv("DB_IDLE_TIMEOUT_MS", 30_000, { min: 1_000 }),
        statement_timeout: readIntEnv("DB_STATEMENT_TIMEOUT_MS", 30_000, { min: 100 }),
        application_name: "template_next",
    });

    // An idle client can error (e.g. the server restarts). Without a handler Node would
    // treat it as an uncaught exception and crash the process.
    pool.on("error", (error) => log.error("Unexpected PostgreSQL pool error", error));

    return pool;
}

// Reuse the pool across hot reloads in development so connections do not leak.
export const pool: Pool = globalThis.__dbPool ?? createPool();
globalThis.__dbPool = pool;

const db = drizzle({ client: pool, logger, relations });

export default db;
