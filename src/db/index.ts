/** PostgreSQL connection pool and Drizzle database instance. */
import "server-only";
import { DefaultLogger, LogWriter } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getPositiveIntegerEnv, getServerEnv } from "@/utils/server-env";
import log from "@/utils/stdlog";

import { relations } from "./relations";

class DatabaseLogWriter implements LogWriter {
    write(message: string) {
        log.debug(message);
    }
}

const pool = new Pool({
    user: getServerEnv("POSTGRES_USER"),
    password: getServerEnv("POSTGRES_PASSWORD"),
    database: getServerEnv("POSTGRES_DB"),
    host: getServerEnv("DB_HOST"),
    port: getPositiveIntegerEnv("DB_PORT", 5432),
    max: getPositiveIntegerEnv("DB_POOL_MAX", 10),
    connectionTimeoutMillis: getPositiveIntegerEnv("DB_CONNECTION_TIMEOUT_MS", 5_000),
    idleTimeoutMillis: getPositiveIntegerEnv("DB_IDLE_TIMEOUT_MS", 30_000),
    statement_timeout: getPositiveIntegerEnv("DB_STATEMENT_TIMEOUT_MS", 30_000),
    application_name: "template-next",
    keepAlive: true,
});

pool.on("error", (error) => {
    log.error("Unexpected PostgreSQL connection-pool error", error);
});

const db = drizzle(pool, {
    logger: new DefaultLogger({ writer: new DatabaseLogWriter() }),
    relations,
});

export { pool };
export default db;
