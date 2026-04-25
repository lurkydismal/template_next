"use client";

import { isDev, needTrace } from "@/utils/stdvar";
import { CommonLogger, LogFn } from "./types";

/**
 * Create a browser-friendly logger that:
 * - Uses CSS styles for log level labels.
 * - Chooses the best available console method (debug/info/warn/error).
 * - Formats log lines to include a colored level label and the provided arguments.
 *
 * Important behavior details:
 * - If a single object is passed, the call prints `label, style, object` so inspectability
 *   in devtools is preserved.
 * - If the first argument is a string (or multiple args), it prints `label, style, ...args`.
 */
function makeBrowserLogger(): CommonLogger {
    const styles: Record<string, string> = {
        TRACE: "color:#888",
        DEBUG: "color:lime",
        INFO: "color:#64b5f6",
        WARN: "color:darkorange;font-weight:700",
        ERROR: "color:#ef9a9a",
        FATAL: "background:crimson;color:white;font-weight:700;padding:2px 4px;border-radius:2px",
    };

    /**
     * Map a log level to the appropriate console method.
     * Falls back to console.log when a specific method is not available.
     */
    const getConsoleMethod = (level: string) => {
        switch (level) {
            case "TRACE":
            case "DEBUG":
                return console.debug ?? console.log;
            case "INFO":
                return console.info ?? console.log;
            case "WARN":
                return console.warn ?? console.log;
            case "ERROR":
            case "FATAL":
            default:
                return console.error ?? console.log;
        }
    };

    /**
     * Create a level-specific logging function that:
     * - Prepends a styled level label (`%cLEVEL`) so the label is colored.
     * - Preserves object inspectability in devtools by treating single-object calls specially.
     */
    const makeLevel = (level: string): LogFn => {
        const method = getConsoleMethod(level);
        const label = `%c${level}`;
        const style = styles[level] ?? "";

        return (...args: unknown[]) => {
            // If first arg is a string, include it in the formatted line; otherwise show label + object(s)
            if (args.length === 1 && typeof args[0] === "object") {
                method.call(console, label, style, args[0]);
                return;
            }
            // If first arg is a string, show label and the rest of args inline
            method.call(console, label, style, ...args);
        };
    };

    return {
        trace: needTrace ? makeLevel("TRACE") : () => {},
        debug: isDev ? makeLevel("DEBUG") : () => {},
        info: makeLevel("INFO"),
        warn: makeLevel("WARN"),
        error: makeLevel("ERROR"),
        fatal: makeLevel("FATAL"),
    };
}

/**
 * `browserLogger` - a lightweight, styled console logger for use in browser environments.
 */
export const browserLogger = makeBrowserLogger();
