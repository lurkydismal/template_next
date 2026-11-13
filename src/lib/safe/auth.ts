"use server";

import { isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { returnServerError, returnValidationErrors } from "next-safe-action";
import { redirect } from "next/navigation";

import db from "@/db";
import { user } from "@/db/schema";
import auth from "@/lib/auth";
import { userMessages } from "@/utils/messages";
import { loginUserSchema, registerUserSchema } from "@/utils/validate/schemas";

import { actionClient } from "./client";

function getAuthErrorCode(error: unknown): string | undefined {
    if (!isAPIError(error)) return undefined;
    const body = error.body;
    if (typeof body !== "object" || body === null || !("code" in body)) return undefined;
    return typeof body.code === "string" ? body.code : undefined;
}

function isDuplicateAccountError(error: unknown): boolean {
    const code = getAuthErrorCode(error);
    return code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";
}

function isInvalidCredentialsError(error: unknown): boolean {
    if (!isAPIError(error)) return false;

    const code = getAuthErrorCode(error);
    return (
        code === "INVALID_EMAIL_OR_PASSWORD" ||
        code === "INVALID_PASSWORD" ||
        error.statusCode === 401 ||
        error.statusCode === 403
    );
}

function handleAuthError(error: unknown, operation: "login" | "register"): never {
    if (!isAPIError(error)) throw error;

    if (operation === "register" && isDuplicateAccountError(error)) {
        return returnValidationErrors(registerUserSchema, {
            email: { _errors: [userMessages.auth.accountExists] },
        });
    }

    if (operation === "login" && isInvalidCredentialsError(error)) {
        return returnServerError(userMessages.auth.invalidCredentials);
    }

    const message =
        operation === "login" ? userMessages.auth.signInFailed : userMessages.auth.signUpFailed;
    return returnServerError(message);
}

export const register = actionClient
    .inputSchema(registerUserSchema)
    .action(async ({ parsedInput }) => {
        // Check before calling Better Auth: some releases intentionally return a
        // successful-looking response for duplicate emails to reduce enumeration.
        const [existingUser] = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, parsedInput.email))
            .limit(1);

        if (existingUser) {
            return returnValidationErrors(registerUserSchema, {
                email: { _errors: [userMessages.auth.accountExists] },
            });
        }

        try {
            await auth.api.signUpEmail({ body: parsedInput });
        } catch (error) {
            handleAuthError(error, "register");
        }

        redirect("/");
    });

export const login = actionClient.inputSchema(loginUserSchema).action(async ({ parsedInput }) => {
    try {
        await auth.api.signInEmail({
            body: {
                email: parsedInput.email,
                password: parsedInput.password,
                rememberMe: parsedInput.remember,
            },
        });
    } catch (error) {
        handleAuthError(error, "login");
    }

    redirect("/");
});
