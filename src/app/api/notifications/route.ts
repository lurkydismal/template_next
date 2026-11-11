import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import type { NotificationsRow } from "@/db/types";

import db from "@/db";
import { notifications } from "@/db/schema";
import { emitNotificationEvent } from "@/lib/dashboard/common/change-events";
import { userMessages } from "@/utils/messages";
import log from "@/utils/stdlog";

type NotificationType = NotificationsRow["type"];

/**
 * Reads notifications and unread count for toolbar center state.
 */
export async function GET(): Promise<Response> {
    const getUnreadNotifications = async () => {
        const rows = await db.select().from(notifications).orderBy(asc(notifications.created_at));
        const unreadResult = await db
            .select({ total: count() })
            .from(notifications)
            .where(eq(notifications.is_read, false));

        return { rows, unreadResult };
    };

    try {
        const { rows, unreadResult } = await getUnreadNotifications();
        return Response.json({ rows, unreadCount: unreadResult[0]?.total ?? 0 });
    } catch (error) {
        log.error("Failed to read notifications", error);
        return Response.json({ error: userMessages.errors.notificationsLoad }, { status: 500 });
    }
}

/**
 * Persists one notification and emits it through the shared SSE bus.
 */
export async function POST(request: Request): Promise<Response> {
    const invalidResponse = Response.json(
        { error: userMessages.validation.invalidJson },
        { status: 400 },
    );

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return invalidResponse;
    }

    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        return Response.json(
            { error: userMessages.validation.invalidNotificationData },
            { status: 400 },
        );
    }

    const data = payload as Record<string, unknown>;
    const typeValue = data.type ?? "default";
    const message = typeof data.message === "string" ? data.message.trim() : "";
    const validTypes: NotificationType[] = ["default", "success", "error", "warning", "info"];

    if (typeof typeValue !== "string" || !validTypes.includes(typeValue as NotificationType)) {
        return Response.json(
            { error: userMessages.validation.notificationTypeInvalid },
            { status: 400 },
        );
    }

    const type = typeValue as NotificationType;

    if (!message) {
        return Response.json(
            { error: userMessages.validation.notificationMessageRequired },
            { status: 400 },
        );
    }

    try {
        const [created] = await db.insert(notifications).values({ type, message }).returning();

        if (created) {
            await emitNotificationEvent({
                event: "notification",
                notificationId: created.id,
                type: created.type,
                message: created.message,
                occurredAt: new Date().toISOString(),
            });

            return Response.json(created, { status: 201 });
        }

        return Response.json({ error: userMessages.errors.notificationsCreate }, { status: 500 });
    } catch (error) {
        log.error("Failed to create notification", error);
        return Response.json({ error: userMessages.errors.notificationsCreate }, { status: 500 });
    }
}

/**
 * Marks a set of notifications as read/unread to keep badge state in sync.
 */
export async function PATCH(request: Request): Promise<Response> {
    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return Response.json({ error: userMessages.validation.invalidJson }, { status: 400 });
    }

    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        return Response.json(
            { error: userMessages.validation.invalidNotificationData },
            { status: 400 },
        );
    }

    const data = payload as Record<string, unknown>;
    const ids = Array.isArray(data.ids) ? data.ids : [];
    const normalizedIds = [
        ...new Set(
            ids.filter(
                (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0,
            ),
        ),
    ];
    if (!normalizedIds.length) {
        return Response.json(
            { error: userMessages.validation.notificationIdsRequired },
            { status: 400 },
        );
    }

    const isRead = data.isRead === undefined ? true : data.isRead;
    if (typeof isRead !== "boolean") {
        return Response.json(
            { error: userMessages.validation.invalidNotificationData },
            { status: 400 },
        );
    }

    try {
        await db
            .update(notifications)
            .set({
                is_read: isRead,
                read_at: isRead ? sql`now()` : null,
            })
            .where(
                and(inArray(notifications.id, normalizedIds), eq(notifications.is_read, !isRead)),
            );

        return Response.json({ ok: true });
    } catch (error) {
        log.error("Failed to update notifications", error);
        return Response.json({ error: userMessages.errors.notificationsUpdate }, { status: 500 });
    }
}
