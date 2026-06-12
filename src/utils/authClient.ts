"use server";

import { createSafeActionClient } from "next-safe-action";
import { betterAuth } from "@next-safe-action/adapter-better-auth";
import auth from "@/lib/auth";
import z from "zod";

// Public action client (no auth required)
export const actionClient = createSafeActionClient();

// Authenticated action client
export const authClient = actionClient.use(betterAuth(auth));

export const signIn = authClient
    .inputSchema(z.object({ email: z.string().email(), password: z.string() }))
    .action(async ({ parsedInput, ctx }) => {
        // This works because nextCookies() handles cookie setting
        await ctx.auth.session; // session is already available from the middleware

        // Or call other Better Auth functions that set cookies:
        // await auth.api.signInEmail({ body: parsedInput });
    });
