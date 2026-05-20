import type { DbTarget } from "@/lib/types";

import { cacheLife, cacheTag, updateTag } from "next/cache";

const DB_CACHE_TAG_PREFIX = "db";

export const DASHBOARD_DB_CACHE_LIFE = {
    expire: 60 * 60,
    revalidate: 60,
    stale: 30,
};

/**
 * Builds a stable cache tag for a database table or query dependency.
 */
export function getDbCacheTag(target: DbTarget | "all") {
    return `${DB_CACHE_TAG_PREFIX}:${target}`;
}

/**
 * Applies shared cache metadata to cached database reads.
 */
export function cacheDbRequest(targets: readonly (DbTarget | "all")[]) {
    cacheLife(DASHBOARD_DB_CACHE_LIFE);
    cacheTag(getDbCacheTag("all"), ...targets.map(getDbCacheTag));
}

/**
 * Expires cached database reads for mutated tables in the current Server Action.
 */
export function updateDbCacheTags(targets: readonly DbTarget[]) {
    for (const target of targets) {
        updateTag(getDbCacheTag(target));
    }
}

/**
 * Flushes every DB-related cache entry (bulk invalidation).
 */
export function flushAllDbCaches() {
    updateTag(getDbCacheTag("all"));
}
