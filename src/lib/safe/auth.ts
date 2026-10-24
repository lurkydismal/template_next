"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import auth from "@/lib/auth";
import { authClient } from "@/lib/auth/client";
import { loginUserSchema, registerUserSchema } from "@/utils/validate/schemas";

import { actionClient } from "./client";

export const register = actionClient
    .inputSchema(registerUserSchema)
    .action(async ({ parsedInput }) => {
        await auth.api.signUpEmail({ body: parsedInput });

        redirect("/");
    });

export const login = actionClient.inputSchema(loginUserSchema).action(async ({ parsedInput }) => {
    await auth.api.signInEmail({ body: parsedInput });

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
