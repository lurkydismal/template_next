import "server-only";
import { readFileSync } from "node:fs";

/**
 * Read a server-only environment variable, supporting the common `_FILE`
 * convention used by Docker secrets and the official PostgreSQL image.
 *
 * Secret file contents retain intentional whitespace; only the final newline
 * added by tools such as `printf`/`echo` is removed.
 */
export function getServerEnv(name: string, defaultValue?: string): string {
    const value = process.env[name];

    if (value !== undefined && value !== "") {
        return value;
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

    if (defaultValue !== undefined) {
        return defaultValue;
    }

    throw new Error(`Missing required environment variable: ${name}`);
}

export function getPositiveIntegerEnv(name: string, defaultValue: number): number {
    const rawValue = getServerEnv(name, String(defaultValue));
    const parsedValue = Number(rawValue);

    if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }

    return parsedValue;
}

export function getBooleanEnv(name: string, defaultValue: boolean): boolean {
    const value = getServerEnv(name, String(defaultValue)).toLowerCase();

    if (value === "true" || value === "1" || value === "yes") return true;
    if (value === "false" || value === "0" || value === "no") return false;

    throw new Error(`${name} must be one of: true, false, 1, 0, yes, no`);
}
