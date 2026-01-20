"use server";

/**
 * Server-only mock action helper.
 *
 * Provides a single overloaded async function used to simulate server work
 * with a configurable delay and predictable return shapes.
 *
 * Supported behaviors:
 * - Delay only → returns `{ ok: true }`
 * - Delay + value → returns `{ ok: true, result }`
 * - Delay + value + field name → returns `{ ok: true, [fieldName]: value }`
 *
 * Intended for testing, prototyping, and UI development where real backend
 * logic is not yet available but timing and response structure matter.
 *
 * Marked with `"use server"` so it can be called as a Next.js Server Action.
 */

import { delay } from "@/utils/stdfunc";

/**
 * Mock server action that only waits for the specified duration
 * and returns a simple success response.
 *
 * @param milliseconds - How long to delay before resolving.
 * @returns An object indicating successful completion.
 */
export async function mockAction(milliseconds: number): Promise<{ ok: true }>;

/**
 * Mock server action that waits for the specified duration
 * and returns a success response with a `result` field.
 *
 * @typeParam T - Type of the result payload.
 * @param milliseconds - How long to delay before resolving.
 * @param result - Value to include in the response under `result`.
 * @returns An object with `{ ok: true, result }`.
 */
export async function mockAction<T>(
    milliseconds: number,
    result: T,
): Promise<{ ok: true; result: T }>;

/**
 * Mock server action that waits for the specified duration
 * and returns a success response with a dynamically named field.
 *
 * @typeParam T - Type of the result payload.
 * @typeParam K - String literal type used as the response field name.
 * @param milliseconds - How long to delay before resolving.
 * @param result - Value to include in the response.
 * @param fieldName - Name of the field under which `result` is returned.
 * @returns An object with `{ ok: true }` plus `{ [fieldName]: result }`.
 */
export async function mockAction<T, K extends string>(
    milliseconds: number,
    result: T,
    fieldName: K,
): Promise<{ ok: true } & Record<K, T>>;

/**
 * Implementation of the overloaded `mockAction`.
 *
 * Behavior:
 * - Always waits for the specified delay.
 * - If no `result` is provided, returns `{ ok: true }`.
 * - If `fieldName` is provided, returns `{ ok: true, [fieldName]: result }`.
 * - Otherwise, returns `{ ok: true, result }`.
 *
 * This function is intended for testing, prototyping, or mocking
 * server actions with predictable timing and response shapes.
 */
export async function mockAction<T, K extends string>(
    milliseconds: number,
    result?: T,
    fieldName?: K,
) {
    // Simulate async work
    await delay(milliseconds);

    // No payload case
    if (result === undefined) {
        return { ok: true };
    }

    // Dynamic field name case
    if (fieldName) {
        return {
            ok: true,
            [fieldName]: result,
        };
    }

    // Default payload case
    return {
        ok: true,
        result,
    };
}
