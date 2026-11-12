import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import db from "@/db";
import * as schema from "@/db/schema";

import { authConfig } from "./config";

const auth = betterAuth({
    secret: authConfig.secret,
    baseURL: authConfig.baseURL,
    trustedOrigins: authConfig.trustedOrigins,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
        disableSignUp: authConfig.signUpDisabled,
        // No mail transport is configured, so verification cannot be enforced yet.
        requireEmailVerification: false,
    },
    session: {
        cookieCache: {
            enabled: true,
            strategy: "jwt",
        },
    },
    advanced: {
        useSecureCookies: authConfig.useSecureCookies,
    },
    rateLimit: {
        // Better Auth applies stricter built-in limits to sign-in/sign-up paths.
        enabled: authConfig.rateLimitEnabled,
    },
    plugins: [
        nextCookies(), // must be the last plugin in the array
    ],
});

export default auth;
