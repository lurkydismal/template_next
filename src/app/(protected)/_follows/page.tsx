import { Follow } from "@/components/follows/Follows";
import MainContent from "@/components/follows/MainContent";
import MainFallback from "@/components/MainFallback";
import db from "@/db";
import { categories, follows, posts, users } from "@/db/schema";
import { CategoriesRowPublic, PostsRow, UsersRowPublic } from "@/db/types";
import { getSessionData } from "@/lib/auth";
import { getUserId, requestUserId } from "@/lib/user";
import { and, eq, sql, desc } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { unauthorized } from "next/navigation";

/** Result types */
type FollowedUserWithLatestPost = {
    user_id: number;
    username: string;
    username_normalized: string;
    post_id: number | null;
    post_title: string | null;
    post_description: string | null;
    post_content: string | null;
    post_created_at: Date | null;
    category_id: number | null;
    category_name: string | null;
};

/**
 * Returns one row per user that `userId` follows.
 * Each row contains the user + their latest post (if present) + that post's category.
 */
async function getFollowedUsersWithLatestPost(
    userId: number,
): Promise<FollowedUserWithLatestPost[]> {
    const latestPost = db
        .select({
            id: posts.id,
            title: posts.title,
            description: posts.description,
            content: posts.content,
            created_at: posts.created_at,
            category_id: posts.category_id,
        })
        .from(posts)
        .where(eq(posts.author_id, users.id))
        .orderBy(desc(posts.created_at))
        .limit(1)
        .as("latest_post");

    const rows = await db
        .select({
            user_id: users.id,
            username: users.username,
            username_normalized: users.username_normalized,
            post_id: latestPost.id,
            post_title: latestPost.title,
            post_description: latestPost.description,
            post_content: latestPost.content,
            post_created_at: latestPost.created_at,
            category_id: latestPost.category_id,
            category_name: categories.name,
        })
        .from(follows)
        .where(eq(follows.follower_id, userId))
        .innerJoin(users, eq(users.id, follows.following_id))
        // join posts to pick the row that matches (author_id, created_at = latest_created_at)
        .leftJoinLateral(latestPost, sql`true`)
        .leftJoin(categories, eq(categories.id, latestPost.category_id))
        .orderBy(users.username_normalized)
        .execute();

    // Drizzle returns typed rows; map to the lightweight result type
    return rows.map((r) => ({
        user_id: r.user_id,
        username: r.username,
        username_normalized: r.username_normalized,
        post_id: r.post_id ?? null,
        post_title: r.post_title ?? null,
        post_description: r.post_description ?? null,
        post_content: r.post_content ?? null,
        post_created_at: r.post_created_at ?? null,
        category_id: r.category_id ?? null,
        category_name: r.category_name ?? null,
    }));
}

/**
 * Returns the distinct set (array) of category names used by those latest posts
 * (only includes followed users who have at least one post with non-null category).
 */
async function getCategoriesOfFollowedUsersLatestPosts(
    userId: number,
): Promise<string[]> {
    // same latest-per-author subquery
    const latestPerAuthor = db
        .select({
            author_id: posts.author_id,
            latest_created_at: sql`max(${posts.created_at})`.as(
                "latest_created_at",
            ),
        })
        .from(posts)
        .groupBy(posts.author_id)
        .as("latest_per_author");

    const rows = await db
        .select({ name: categories.name })
        .from(follows)
        .where(eq(follows.follower_id, userId))
        // match subquery by followed user id
        .innerJoin(
            latestPerAuthor,
            eq(latestPerAuthor.author_id, follows.following_id),
        )
        .innerJoin(
            posts,
            and(
                eq(posts.author_id, latestPerAuthor.author_id),
                eq(posts.created_at, latestPerAuthor.latest_created_at),
            ),
        )
        .innerJoin(categories, eq(categories.id, posts.category_id))
        // distinct names: groupBy or use .distinct() if available in your drizzle version
        .groupBy(categories.name)
        .execute();

    return rows.map((r) => r.name);
}

/**
 * Convenience function returning both results in one call.
 */
async function getFollowedUsersAndCategories(userId: number) {
    const [usersList, categoriesList] = await Promise.all([
        getFollowedUsersWithLatestPost(userId),
        getCategoriesOfFollowedUsersLatestPosts(userId),
    ]);
    return { users: usersList, categories: categoriesList };
}

export default async function Follows() {
    const session = await getSessionData();
    if (!session) return unauthorized();

    const getInfoFromSession = async (
        session: NonNullable<Awaited<ReturnType<typeof getSessionData>>>,
    ) => {
        const _userId = requestUserId(session.username_normalized);

        const userId = await getUserId(_userId);
        if (!userId) return unauthorized();

        const { users: _users, categories } =
            await getFollowedUsersAndCategories(userId);

        const feed: Follow[] = _users
            // .filter((u) => u.post_id !== null) // drop users without posts (Follow.post is required)
            .map((u) => {
                const author: UsersRowPublic = {
                    // minimal public user shape based on what you selected earlier
                    // add/adjust fields if your UsersRowPublic requires more properties
                    id: u.user_id,
                    username: u.username,
                    username_normalized: u.username_normalized,
                } as UsersRowPublic;

                const post: PostsRow | null = u.post_id
                    ? {
                          // minimal post shape using fields returned by your query.
                          // expand/adjust as needed to match PostsRowFull in your project.
                          id: u.post_id as number,
                          author_id: u.user_id,
                          co_author_id: null,
                          category_id: u.category_id ?? null,
                          preview_url: null,
                          title: u.post_title ?? "",
                          description: u.post_description ?? null,
                          content: u.post_content ?? "",
                          created_at: u.post_created_at ?? new Date(0),
                          updated_at: u.post_created_at ?? new Date(0),
                      }
                    : null;

                return { author, post } as Follow;
            });

        const tags: CategoriesRowPublic[] = categories.map((value) => ({
            name: value,
        }));

        return { feed, tags };
    };

    const { feed, tags } = await getInfoFromSession(session);

    return (
        <MainFallback itemsLength={feed.length}>
            <MainContent follows={feed} tags={tags} />
        </MainFallback>
    );
}
