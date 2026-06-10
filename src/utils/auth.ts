import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "@/db";

export const auth = betterAuth({
    // ...your config (database, plugins, etc.)
    database: drizzleAdapter(db, {
        provider: "pg", // or "sqlite"
    }),
    plugins: [
        // ...other plugins
        nextCookies(), // must be the last plugin in the array
    ],
});