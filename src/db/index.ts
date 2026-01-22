/**
 * Database configuration for PostgreSQL using Drizzle ORM.
 *
 * - Loads environment variables from .env.
 * - Configures Drizzle with snake_case mapping.
 * - Sets up a custom logger that routes Drizzle logs to a browser-style logger.
 * - Exports the configured database instance for use across the application.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { DefaultLogger, LogWriter } from "drizzle-orm/logger";
import log from "@/utils/stdlog";

// Custom implementation of Drizzle's LogWriter interface
// All log messages from Drizzle will be routed through this writer
class MyLogWriter implements LogWriter {
    write(message: string) {
        log.info(message);
    }
}

// Instantiate the default Drizzle logger using the custom writer
const logger = new DefaultLogger({ writer: new MyLogWriter() });

// Create a Drizzle database instance configured for PostgreSQL
// Connection info is read from environment variables
// `casing: "snake_case"` ensures database fields are mapped in snake_case
const db = drizzle({
    connection: {
        user: process.env.POSTGRES_USER!,
        password: process.env.POSTGRES_PASSWORD!,
        database: process.env.POSTGRES_DB!,
        host: process.env.DB_HOST!,
        port: Number(process.env.DB_PORT!),
    },
    casing: "snake_case",
    logger,
});

export default db;
