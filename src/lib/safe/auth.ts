"use server";

import z from "zod";
import { authClient } from "@/lib/auth/client";
import auth from "@/lib/auth";

export const register = authClient
    .inputSchema(z.object({ name: z.string(), email: z.email(), password: z.string() }))
    .action(async ({ parsedInput }) => {
        await auth.api.signUpEmail({ body: parsedInput });
    });

export const login = authClient
    .inputSchema(z.object({ email: z.email(), password: z.string() }))
    .action(async ({ parsedInput }) => {
        await auth.api.signInEmail({ body: parsedInput });
    });

export const logout = authClient
    .inputSchema(z.object({ email: z.email(), password: z.string() }))
    .action(async () => {
        await auth.api.signOut();
    });

// export const getSession = authClient
//     .outputSchema(sessionSchema)
//     .action(async () => {
//         return await auth.api.getSession({
//             headers: await headers(),
//         });
//     });
