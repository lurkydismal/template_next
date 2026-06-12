import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/db/schema";
import db from "@/db";

const auth = betterAuth({
    // ...your config (database, plugins, etc.)
    database: drizzleAdapter(db, {
        provider: "pg", // or "sqlite"
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    session: {
        cookieCache: {
            enabled: true,
            strategy: "jwt",
        },
    },
    plugins: [
        // ...other plugins
        nextCookies(), // must be the last plugin in the array
    ],
});

export default auth;
