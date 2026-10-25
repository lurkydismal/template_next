"use server";

import { desc, eq } from "drizzle-orm";

import db from "@/db";
import { user } from "@/db/schema";
import { cacheDbRequest } from "@/lib/cache";
import { normalizeArrayOrValue } from "@/utils/stdfunc";
import log from "@/utils/stdlog";
import { userSelectPublicSchema } from "@/utils/validate/schemas";

/**
 * Requests user id from the database.
 */
export async function requestUserId(name: string) {
    "use cache";
    cacheDbRequest(["user"]);

    log.trace("requestUserId called", { name });

    return db.select({ id: user.id }).from(user).where(eq(user.name, name)).limit(1).execute();
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
export async function requestUser(uid: string) {
    "use cache";
    cacheDbRequest(["user"]);

    log.trace("requestUser called", { uid, uidType: typeof uid });

    const field = user.id;

    return db
        .select({
            name: user.name,
        })
        .from(user)
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
    cacheDbRequest(["user"]);

    log.trace("requestAllUsers called");

    return db
        .select({
            name: user.name,
        })
        .from(user)
        .orderBy(desc(user.name))
        .execute();
}

/**
 * Gets all users.
 */
export async function getAllUsers(request: ReturnType<typeof requestAllUsers>) {
    log.trace("getAllUsers called");
    return userSelectPublicSchema.array().parse(await request);
}
