"use server";

import { isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { returnServerError, returnValidationErrors } from "next-safe-action";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import db from "@/db";
import { user } from "@/db/schema";
import auth from "@/lib/auth";
import { authClient } from "@/lib/auth/client";
import { userMessages } from "@/utils/messages";
import { loginUserSchema, registerUserSchema } from "@/utils/validate/schemas";

import { actionClient } from "./client";

function getAuthErrorCode(error: unknown): string | undefined {
    if (!isAPIError(error)) return undefined;

    const body = error.body;
    if (typeof body !== "object" || body === null || !("code" in body)) return undefined;

    return typeof body.code === "string" ? body.code : undefined;
}

function handleAuthError(error: unknown, operation: "login" | "register"): never {
    if (!isAPIError(error)) {
        throw error;
    }

    const code = getAuthErrorCode(error);

    if (
        operation === "register" &&
        (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")
    ) {
        return returnValidationErrors(registerUserSchema, {
            email: { _errors: [userMessages.auth.accountExists] },
        });
    }

    if (
        operation === "login" &&
        (code === "INVALID_EMAIL_OR_PASSWORD" ||
            code === "INVALID_PASSWORD" ||
            error.statusCode === 401 ||
            error.statusCode === 403)
    ) {
        return returnServerError(userMessages.auth.invalidCredentials);
    }

    return returnServerError(
        operation === "login" ? userMessages.auth.signInFailed : userMessages.auth.signUpFailed,
    );
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

export const logout = authClient.action(async () => {
    await auth.api.signOut();
});

export const getSession = authClient.action(async () => {
    return await auth.api.getSession({
        headers: await headers(),
    });
});
