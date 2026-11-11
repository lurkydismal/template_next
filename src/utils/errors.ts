import { userMessages } from "@/utils/messages";

/** An error that is deliberately safe to display to the end user. */
export class UserFacingError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "UserFacingError";
    }
}

function getAttachedUserMessage(error: object): string | undefined {
    if (!("userMessage" in error)) return undefined;

    const message = (error as { userMessage?: unknown }).userMessage;
    return typeof message === "string" && message.trim() ? message.trim() : undefined;
}

/** Converts explicitly safe errors to copy; unexpected exceptions stay generic. */
export function getErrorMessage(
    error: unknown,
    fallback: string = userMessages.errors.unexpected,
): string {
    if (error instanceof UserFacingError) return error.message.trim() || fallback;
    if (typeof error === "string") return error.trim() || fallback;
    if (typeof error === "object" && error !== null) {
        return getAttachedUserMessage(error) ?? fallback;
    }

    return fallback;
}
