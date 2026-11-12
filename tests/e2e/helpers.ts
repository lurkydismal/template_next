import { expect, type APIRequestContext, type Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";

export const PASSWORD = "E2e-correct-horse-123";

export function newUser(label = "user") {
    const id = randomUUID().slice(0, 8);
    return {
        name: `E2E ${label} ${id}`,
        email: `e2e-${label}-${id}@example.test`,
        password: PASSWORD,
    };
}

/** Registers a user through the Better Auth API; the request context keeps the session cookie. */
export async function signUp(request: APIRequestContext, user = newUser()) {
    const response = await request.post("/api/auth/sign-up/email", { data: user });
    expect(response.ok(), `sign-up failed: ${response.status()} ${await response.text()}`).toBe(
        true,
    );
    return user;
}

/** `Cookie` header value for the request context's current session (for raw fetch/SSE). */
export async function cookieHeader(request: APIRequestContext): Promise<string> {
    const { cookies } = await request.storageState();
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

/** A browser context that carries the same session as `request`. */
export async function browserContextFor(browser: Browser, request: APIRequestContext) {
    return browser.newContext({ storageState: await request.storageState() });
}

/** Reads SSE text until `predicate` is satisfied or `timeoutMs` elapses. */
export async function readSse(
    response: Response,
    predicate: (text: string) => boolean,
    timeoutMs = 10_000,
): Promise<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    const deadline = Date.now() + timeoutMs;

    try {
        while (!predicate(text)) {
            const remaining = deadline - Date.now();
            if (remaining <= 0)
                throw new Error(`Timed out waiting for SSE frame. Received:\n${text}`);
            const chunk = await Promise.race([
                reader.read(),
                new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new Error(`SSE read timed out. Received:\n${text}`)),
                        remaining,
                    ),
                ),
            ]);
            if (chunk.done) break;
            text += decoder.decode(chunk.value);
        }
    } finally {
        await reader.cancel().catch(() => undefined);
    }
    return text;
}
