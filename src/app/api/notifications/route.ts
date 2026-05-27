import db from "@/db";
import { notifications } from "@/db/schema";
import { emitNotificationEvent } from "@/lib/dashboard/common/change-events";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

type NotificationType = "default" | "success" | "error" | "warning" | "info";

/**
 * Reads notifications and unread count for toolbar center state.
 */
export async function GET(): Promise<Response> {
    const rows = await db.select().from(notifications).orderBy(asc(notifications.created_at));
    const unreadResult = await db
        .select({ total: count() })
        .from(notifications)
        .where(eq(notifications.is_read, false));

    return Response.json({ rows, unreadCount: unreadResult[0]?.total ?? 0 });
}

/**
 * Persists one notification and emits it through the shared SSE bus.
 */
export async function POST(request: Request): Promise<Response> {
    const payload = (await request.json()) as { type?: NotificationType; message?: string };
    const type = payload.type ?? "default";
    const message = (payload.message ?? "").trim();

    if (!message) {
        return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const [created] = await db
        .insert(notifications)
        .values({ type, message })
        .returning();

    await emitNotificationEvent({
        event: "notification",
        notificationId: created.id,
        type: created.type,
        message: created.message,
        occurredAt: new Date().toISOString(),
    });

    return Response.json(created, { status: 201 });
}

/**
 * Marks a set of notifications as read/unread to keep badge state in sync.
 */
export async function PATCH(request: Request): Promise<Response> {
    const payload = (await request.json()) as { ids?: number[]; isRead?: boolean };
    const ids = payload.ids ?? [];

    if (!ids.length) {
        return Response.json({ error: "ids are required" }, { status: 400 });
    }

    const isRead = payload.isRead ?? true;
    await db
        .update(notifications)
        .set({
            is_read: isRead,
            read_at: isRead ? sql`now()` : null,
        })
        .where(and(inArray(notifications.id, ids), eq(notifications.is_read, !isRead)));

    return Response.json({ ok: true });
}
