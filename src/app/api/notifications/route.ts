import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import type { NotificationsRow } from "@/db/types";

import db from "@/db";
import { notifications } from "@/db/schema";
import { getRequestSession } from "@/lib/auth/session";
import { emitNotificationEvent } from "@/lib/dashboard/common/change-events";
import { userMessages } from "@/utils/messages";
import log from "@/utils/stdlog";

type NotificationType = NotificationsRow["type"];
type JsonRecord = Record<string, unknown>;
type JsonReadResult = { ok: true; data: JsonRecord } | { ok: false; response: Response };

function errorResponse(message: string, status = 400): Response {
    return Response.json({ error: message }, { status });
}

function isJsonRecord(value: unknown): value is JsonRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJsonRecord(request: Request): Promise<JsonReadResult> {
    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return { ok: false, response: errorResponse(userMessages.validation.invalidJson) };
    }

    if (!isJsonRecord(payload)) {
        return {
            ok: false,
            response: errorResponse(userMessages.validation.invalidNotificationData),
        };
    }

    return { ok: true, data: payload };
}

function parseNotificationType(value: unknown): NotificationType | null {
    const candidate = value ?? "default";
    const validTypes: readonly NotificationType[] = [
        "default",
        "success",
        "error",
        "warning",
        "info",
    ];
    return typeof candidate === "string" && validTypes.includes(candidate as NotificationType)
        ? (candidate as NotificationType)
        : null;
}

function parseNotificationIds(value: unknown): number[] {
    if (!Array.isArray(value)) return [];

    return [
        ...new Set(
            value.filter(
                (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0,
            ),
        ),
    ];
}

/** Reads notifications and unread count for toolbar center state. */
export async function GET(request: Request): Promise<Response> {
    if (!(await getRequestSession(request))?.user?.id) {
        return errorResponse("Authentication is required", 401);
    }

    try {
        const [rows, unreadResult] = await Promise.all([
            db.select().from(notifications).orderBy(asc(notifications.created_at)),
            db
                .select({ total: count() })
                .from(notifications)
                .where(eq(notifications.is_read, false)),
        ]);

        return Response.json({ rows, unreadCount: unreadResult[0]?.total ?? 0 });
    } catch (error) {
        log.error("Failed to read notifications", error);
        return errorResponse(userMessages.errors.notificationsLoad, 500);
    }
}

/** Persists one notification and emits it through the shared SSE bus. */
export async function POST(request: Request): Promise<Response> {
    if (!(await getRequestSession(request))?.user?.id) {
        return errorResponse("Authentication is required", 401);
    }

    const parsed = await readJsonRecord(request);
    if (!parsed.ok) return parsed.response;

    const type = parseNotificationType(parsed.data.type);
    if (!type) return errorResponse(userMessages.validation.notificationTypeInvalid);

    const message = typeof parsed.data.message === "string" ? parsed.data.message.trim() : "";
    if (!message) return errorResponse(userMessages.validation.notificationMessageRequired);

    try {
        const [created] = await db.insert(notifications).values({ type, message }).returning();
        if (!created) return errorResponse(userMessages.errors.notificationsCreate, 500);

        await emitNotificationEvent({
            event: "notification",
            notificationId: created.id,
            type: created.type,
            message: created.message,
            occurredAt: new Date().toISOString(),
        });

        return Response.json(created, { status: 201 });
    } catch (error) {
        log.error("Failed to create notification", error);
        return errorResponse(userMessages.errors.notificationsCreate, 500);
    }
}

/** Marks a set of notifications as read/unread to keep badge state in sync. */
export async function PATCH(request: Request): Promise<Response> {
    if (!(await getRequestSession(request))?.user?.id) {
        return errorResponse("Authentication is required", 401);
    }

    const parsed = await readJsonRecord(request);
    if (!parsed.ok) return parsed.response;

    const ids = parseNotificationIds(parsed.data.ids);
    if (ids.length === 0) {
        return errorResponse(userMessages.validation.notificationIdsRequired);
    }

    const isRead = parsed.data.isRead === undefined ? true : parsed.data.isRead;
    if (typeof isRead !== "boolean") {
        return errorResponse(userMessages.validation.invalidNotificationData);
    }

    try {
        await db
            .update(notifications)
            .set({
                is_read: isRead,
                read_at: isRead ? sql`now()` : null,
            })
            .where(and(inArray(notifications.id, ids), eq(notifications.is_read, !isRead)));

        return Response.json({ ok: true });
    } catch (error) {
        log.error("Failed to update notifications", error);
        return errorResponse(userMessages.errors.notificationsUpdate, 500);
    }
}
