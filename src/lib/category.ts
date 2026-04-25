"use server";

import db from "@/db";
import { categories } from "@/db/schema";
import { desc } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { categorySelectPublicSchema } from "@/utils/validate/schemas";

export async function requestAllCategories() {
    "use cache";
    cacheTag("categories", "category");

    return db
        .select()
        .from(categories)
        .orderBy(desc(categories.name))
        .execute();
}

export async function getAllCategories(
    request: ReturnType<typeof requestAllCategories>,
) {
    return categorySelectPublicSchema.array().parse(await request);
}
