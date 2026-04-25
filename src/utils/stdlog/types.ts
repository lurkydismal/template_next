export type LogFn = (...args: unknown[]) => void;

/**
 * Common logger shape used by both browser and server implementations.
 * Each property is a logging function that accepts arbitrary arguments.
 */
export type CommonLogger = {
    trace: LogFn;
    debug: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
    fatal: LogFn;
};
