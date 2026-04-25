"use server";

import db from "@/db";
import { users } from "@/db/schema";
import { normalizeArrayOrValue } from "@/utils/stdfunc";
import { userSelectPublicSchema } from "@/utils/validate/schemas";
import { eq, desc } from "drizzle-orm";

export async function requestUserId(usernameNormalized: string) {
    "use cache";

    return db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username_normalized, usernameNormalized))
        .limit(1)
        .execute();
}

export async function getUserId(request: ReturnType<typeof requestUserId>) {
    const userId = normalizeArrayOrValue(await request);
    if (userId && userId.id) return userId.id;

    return null;
}

export async function requestUser(uid: string | number) {
    "use cache";

    const field =
        typeof uid === "string" ? users.username_normalized : users.id;

    return db.select().from(users).where(eq(field, uid)).limit(1).execute();
}

export async function getUser(request: ReturnType<typeof requestUser>) {
    return userSelectPublicSchema.parse(normalizeArrayOrValue(await request));
}

export async function requestAllUsers() {
    "use cache";

    return db
        .select()
        .from(users)
        .orderBy(desc(users.username_normalized))
        .execute();
}

export async function getAllUsers(request: ReturnType<typeof requestAllUsers>) {
    return userSelectPublicSchema.array().parse(await request);
}
