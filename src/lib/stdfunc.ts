"use server";

/**
 * Server-only mock action helper.
 *
 * Provides a single overloaded async function used to simulate server work
 * with a configurable delay and predictable return shapes.
 *
 * Supported behaviors:
 * - Delay only → returns `{ ok: true }`
 * - Delay + value → returns `{ ok: true, data }`
 * - Delay + value + field name → returns `{ ok: true, [fieldName]: value }`
 *
 * Intended for testing, prototyping, and UI development where real backend
 * logic is not yet available but timing and response structure matter.
 */

import { delay } from "@/utils/stdfunc";
import { ActionResult } from "@/lib/types";

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
 * and returns a success response with a `data` field.
 *
 * @typeParam T - Type of the data payload.
 * @param milliseconds - How long to delay before resolving.
 * @param data - Value to include in the response under `data`.
 * @returns An object with `{ ok: true, data }`.
 */
export async function mockAction<T>(
    milliseconds: number,
    data: T,
): Promise<{ ok: true; data: T }>;

/**
 * Mock server action that waits for the specified duration
 * and returns a success response with a dynamically named field.
 *
 * @typeParam T - Type of the data payload.
 * @typeParam K - String literal type used as the response field name.
 * @param milliseconds - How long to delay before resolving.
 * @param data - Value to include in the response.
 * @param fieldName - Name of the field under which `data` is returned.
 * @returns An object with `{ ok: true }` plus `{ [fieldName]: data }`.
 */
export async function mockAction<T, K extends string>(
    milliseconds: number,
    data: T,
    fieldName: K,
): Promise<{ ok: true } & Record<K, T>>;

/**
 * Implementation of the overloaded `mockAction`.
 *
 * Behavior:
 * - Always waits for the specified delay.
 * - If no `data` is provided, returns `{ ok: true }`.
 * - If `fieldName` is provided, returns `{ ok: true, [fieldName]: data }`.
 * - Otherwise, returns `{ ok: true, data }`.
 *
 * This function is intended for testing, prototyping, or mocking
 * server actions with predictable timing and response shapes.
 */
export async function mockAction<T, K extends string>(
    milliseconds: number,
    data?: T,
    fieldName?: K,
): Promise<ActionResult> {
    // Simulate async work
    await delay(milliseconds);

    // No payload case
    if (data === undefined) {
        return { ok: true };
    }

    // Dynamic field name case
    if (fieldName) {
        return {
            ok: true,
            [fieldName]: data,
        };
    }

    // Default payload case
    return {
        ok: true,
        data,
    };
}
