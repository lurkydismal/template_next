import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import db from "@/db";
import * as schema from "@/db/schema";
import { getBooleanEnv, getServerEnv } from "@/utils/server-env";

const baseUrl = new URL(getServerEnv("BETTER_AUTH_URL"));
const isProduction = process.env.NODE_ENV === "production";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new Error("BETTER_AUTH_URL must use http:// or https://");
}

if (isProduction && !isProductionBuild && baseUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
}

const secret = getServerEnv("BETTER_AUTH_SECRET");

if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
}

const configuredOrigins = getServerEnv("BETTER_AUTH_TRUSTED_ORIGINS", baseUrl.origin)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const trustedOrigins = configuredOrigins.length > 0 ? configuredOrigins : [baseUrl.origin];

const auth = betterAuth({
    appName: "Template Next",
    baseURL: baseUrl.origin,
    secret,
    trustedOrigins,
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
        disableSignUp: getBooleanEnv("AUTH_DISABLE_SIGN_UP", isProduction),
        requireEmailVerification: false,
    },
    session: {
        cookieCache: {
            enabled: true,
            strategy: "jwt",
        },
    },
    advanced: {
        useSecureCookies: isProduction || baseUrl.protocol === "https:",
    },
    plugins: [nextCookies()],
});

export default auth;
