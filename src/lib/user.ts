"use server";

import { eq } from "drizzle-orm";

import db from "@/db";
import { user } from "@/db/schema";
import { cacheDbRequest } from "@/lib/cache";
import { normalizeArrayOrValue } from "@/utils/stdfunc";
import log from "@/utils/stdlog";

/** Requests the user ID associated with an authenticated user name. */
export async function requestUserId(name: string) {
    "use cache";
    cacheDbRequest(["user"]);

    log.trace("requestUserId called", { name });

    return db.select({ id: user.id }).from(user).where(eq(user.name, name)).limit(1).execute();
}

/** Resolves the first user ID from the cached lookup result. */
export async function getUserId(request: ReturnType<typeof requestUserId>) {
    const userId = normalizeArrayOrValue(await request);
    log.debug("getUserId normalized result", { userId });
    return userId?.id ?? null;
}
