import { vi } from "vitest";

/**
 * A chainable, awaitable stand-in for a Drizzle query builder. Every builder method returns
 * the same object; awaiting it (or calling `.execute()`) resolves to `result`, or rejects when
 * `result` is an Error.
 */
export function queryChain<T>(result: T | Error) {
    const chain: Record<string, unknown> = {};
    const settle = () =>
        result instanceof Error ? Promise.reject(result) : Promise.resolve(result);

    for (const method of [
        "from",
        "where",
        "orderBy",
        "limit",
        "values",
        "set",
        "returning",
        "leftJoin",
        "execute",
    ]) {
        chain[method] = vi.fn(() => chain);
    }
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        settle().then(resolve, reject);

    return chain as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<T>;
}

export type SessionStub = { user: { id: string; name: string; email: string } };

export function sessionFor(id = "user-1"): SessionStub {
    return { user: { id, name: `Name ${id}`, email: `${id}@example.test` } };
}
