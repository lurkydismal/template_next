"use server";

import { desc, eq } from "drizzle-orm";

import db from "@/db";
import { users } from "@/db/schema";
import { cacheDbRequest } from "@/lib/cache";
import log from "@/utils/stdlog";
import { normalizeArrayOrValue } from "@/utils/stdfunc";
import { userSelectPublicSchema } from "@/utils/validate/schemas";

/**
 * Requests user id from the database.
 */
export async function requestUserId(usernameNormalized: string) {
    "use cache";
    cacheDbRequest(["users"]);

    log.trace("requestUserId called", { usernameNormalized });

    return db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username_normalized, usernameNormalized))
        .limit(1)
        .execute();
}

/**
 * Gets user id.
 */
export async function getUserId(request: ReturnType<typeof requestUserId>) {
    log.trace("getUserId called");
    const userId = normalizeArrayOrValue(await request);
    log.debug("getUserId normalized result", { userId });
    if (userId && userId.id) return userId.id;

    return null;
}

/**
 * Requests user from the database.
 */
export async function requestUser(uid: string | number) {
    "use cache";
    cacheDbRequest(["users"]);

    log.trace("requestUser called", { uid, uidType: typeof uid });

    const field =
        typeof uid === "string" ? users.username_normalized : users.id;

    return db
        .select({
            username: users.username,
            username_normalized: users.username_normalized,
        })
        .from(users)
        .where(eq(field, uid))
        .limit(1)
        .execute();
}

/**
 * Gets user.
 */
export async function getUser(request: ReturnType<typeof requestUser>) {
    log.trace("getUser called");
    return userSelectPublicSchema.parse(normalizeArrayOrValue(await request));
}

/**
 * Requests all users from the database.
 */
export async function requestAllUsers() {
    "use cache";
    cacheDbRequest(["users"]);

    log.trace("requestAllUsers called");

    return db
        .select({
            username: users.username,
            username_normalized: users.username_normalized,
        })
        .from(users)
        .orderBy(desc(users.username_normalized))
        .execute();
}

/**
 * Gets all users.
 */
export async function getAllUsers(request: ReturnType<typeof requestAllUsers>) {
    log.trace("getAllUsers called");
    return userSelectPublicSchema.array().parse(await request);
}
