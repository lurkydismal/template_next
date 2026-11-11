import { userMessages } from "@/utils/messages";

/** An error that is deliberately safe to display to the end user. */
export class UserFacingError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "UserFacingError";
    }
}

/** Converts expected user-safe errors to copy; unexpected exceptions stay generic. */
export function getErrorMessage(
    error: unknown,
    fallback: string = userMessages.errors.unexpected,
): string {
    if (error instanceof UserFacingError) {
        return error.message.trim() || fallback;
    }

    // Plain strings are used for persisted notifications and explicit messages.
    if (typeof error === "string") {
        return error.trim() || fallback;
    }

    if (typeof error === "object" && error !== null && "userMessage" in error) {
        const message = (error as { userMessage?: unknown }).userMessage;
        if (typeof message === "string" && message.trim()) return message.trim();
    }

    return fallback;
}
