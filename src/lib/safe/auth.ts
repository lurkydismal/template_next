"use server";

import z from "zod";
import { authClient } from "@/lib/auth/client";
import auth from "@/lib/auth";
import { headers } from "next/headers";
import { actionClient } from "./client";

const registerUserSchema = z.object({ name: z.string(), email: z.email(), password: z.string() });

export const register = actionClient
    .inputSchema(registerUserSchema)
    .action(async ({ parsedInput }) => {
        await auth.api.signUpEmail({ body: parsedInput });
    });

const loginUserSchema = z.object({ email: z.email(), password: z.string(), remember: z.boolean().optional() });

export const login = actionClient
    .inputSchema(loginUserSchema)
    .action(async ({ parsedInput }) => {
        await auth.api.signInEmail({ body: parsedInput });
    });

export const logout = authClient
    .action(async () => {
        await auth.api.signOut();
    });

export const getSession = authClient
    .action(async () => {
        return await auth.api.getSession({
            headers: await headers(),
        });
    });
