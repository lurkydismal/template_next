import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryChain, sessionFor } from "./helpers/db";

const mocks = vi.hoisted(() => ({
    db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
    guardRoute: vi.fn(),
    emitNotificationEvent: vi.fn(),
}));

vi.mock("@/db", () => ({ default: mocks.db }));
vi.mock("@/lib/dal/require-session", () => ({ guardRoute: mocks.guardRoute }));
vi.mock("@/lib/dashboard/common/change-events", () => ({
    emitNotificationEvent: mocks.emitNotificationEvent,
}));
vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { GET, PATCH, POST } from "../src/app/api/notifications/route";

const URL_ = "https://app.example.test/api/notifications";
const json = (method: string, body: unknown) =>
    new Request(URL_, {
        method,
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });

const unauthorized = () =>
    Response.json({ error: "You need to sign in to do that." }, { status: 401 });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.guardRoute.mockResolvedValue(sessionFor());
});

describe("authentication", () => {
    it.each([
        ["GET", () => GET()],
        ["POST", () => POST(json("POST", { message: "x" }))],
        ["PATCH", () => PATCH(json("PATCH", { ids: [1] }))],
    ])(
        "%s returns 401 and performs no database work for anonymous callers",
        async (_name, call) => {
            mocks.guardRoute.mockResolvedValue(unauthorized());

            const response = await call();

            expect(response.status).toBe(401);
            expect(mocks.db.select).not.toHaveBeenCalled();
            expect(mocks.db.insert).not.toHaveBeenCalled();
            expect(mocks.db.update).not.toHaveBeenCalled();
            expect(mocks.emitNotificationEvent).not.toHaveBeenCalled();
        },
    );
});

describe("GET", () => {
    it("returns rows with the unread count", async () => {
        const rows = [{ id: 1, message: "a", is_read: false }];
        mocks.db.select
            .mockReturnValueOnce(queryChain(rows))
            .mockReturnValueOnce(queryChain([{ total: 4 }]));

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ rows, unreadCount: 4 });
    });

    it("defaults the unread count to 0 and hides database errors", async () => {
        mocks.db.select.mockReturnValueOnce(queryChain([])).mockReturnValueOnce(queryChain([]));
        expect((await (await GET()).json()).unreadCount).toBe(0);

        mocks.db.select.mockReturnValue(
            queryChain(new Error('relation "notifications" does not exist')),
        );
        const failed = await GET();
        expect(failed.status).toBe(500);
        const body = JSON.stringify(await failed.json());
        expect(body).not.toContain("relation");
        expect(body).toContain("Unable to load notifications");
    });
});

describe("POST", () => {
    it.each([
        ["malformed JSON", "{not json", "Invalid JSON payload."],
        ["a JSON array", [1, 2], "Invalid notification data."],
        ["a JSON null", "null", "Invalid notification data."],
        ["a missing message", {}, "Notification message is required."],
        ["a blank message", { message: "   " }, "Notification message is required."],
        ["a non-string message", { message: 5 }, "Notification message is required."],
        ["an unknown type", { message: "x", type: "fatal" }, "Invalid notification type."],
        ["a non-string type", { message: "x", type: 1 }, "Invalid notification type."],
    ])("rejects %s with 400", async (_name, body, message) => {
        const response = await POST(json("POST", body));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: message });
        expect(mocks.db.insert).not.toHaveBeenCalled();
        expect(mocks.emitNotificationEvent).not.toHaveBeenCalled();
    });

    it("stores a trimmed message with the default type and broadcasts it", async () => {
        const created = { id: 7, type: "default", message: "hello", is_read: false };
        const insert = queryChain([created]);
        mocks.db.insert.mockReturnValue(insert);

        const response = await POST(json("POST", { message: "  hello  " }));

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(created);
        expect(insert.values).toHaveBeenCalledWith({ type: "default", message: "hello" });
        expect(mocks.emitNotificationEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                event: "notification",
                notificationId: 7,
                type: "default",
                message: "hello",
            }),
        );
    });

    it.each(["default", "success", "error", "warning", "info"])("accepts type %s", async (type) => {
        mocks.db.insert.mockReturnValue(queryChain([{ id: 1, type, message: "m" }]));
        expect((await POST(json("POST", { message: "m", type }))).status).toBe(201);
    });

    it("does not trust a client-supplied id, read state or timestamps", async () => {
        const insert = queryChain([{ id: 1, type: "info", message: "m" }]);
        mocks.db.insert.mockReturnValue(insert);

        await POST(
            json("POST", {
                message: "m",
                type: "info",
                id: 99,
                is_read: true,
                created_at: "2000-01-01",
            }),
        );

        expect(insert.values).toHaveBeenCalledWith({ type: "info", message: "m" });
    });

    it("returns a generic 500 and does not broadcast when the insert fails", async () => {
        mocks.db.insert.mockReturnValue(queryChain(new Error("password authentication failed")));

        const response = await POST(json("POST", { message: "m" }));

        expect(response.status).toBe(500);
        expect(JSON.stringify(await response.json())).not.toContain("password");
        expect(mocks.emitNotificationEvent).not.toHaveBeenCalled();
    });

    it("returns 500 when the insert yields no row", async () => {
        mocks.db.insert.mockReturnValue(queryChain([]));
        expect((await POST(json("POST", { message: "m" }))).status).toBe(500);
        expect(mocks.emitNotificationEvent).not.toHaveBeenCalled();
    });
});

describe("PATCH", () => {
    it.each([
        ["no ids", {}],
        ["an empty list", { ids: [] }],
        ["only invalid ids", { ids: [0, -1, 1.5, "3", null] }],
    ])("rejects %s", async (_name, body) => {
        const response = await PATCH(json("PATCH", body));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Select at least one notification." });
        expect(mocks.db.update).not.toHaveBeenCalled();
    });

    it("rejects a non-boolean isRead and malformed JSON", async () => {
        expect((await PATCH(json("PATCH", { ids: [1], isRead: "yes" }))).status).toBe(400);
        expect((await PATCH(json("PATCH", "{oops"))).status).toBe(400);
        expect(mocks.db.update).not.toHaveBeenCalled();
    });

    it("marks de-duplicated valid ids as read by default", async () => {
        const update = queryChain(undefined);
        mocks.db.update.mockReturnValue(update);

        const response = await PATCH(json("PATCH", { ids: [2, 2, 3, -4, "x"] }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
        const set = update.set.mock.calls[0]![0] as Record<string, unknown>;
        expect(set.is_read).toBe(true);
        expect(set.read_at).not.toBeNull();
        expect(update.where).toHaveBeenCalledTimes(1);
    });

    it("clears read_at when marking as unread", async () => {
        const update = queryChain(undefined);
        mocks.db.update.mockReturnValue(update);

        await PATCH(json("PATCH", { ids: [1], isRead: false }));

        expect(update.set).toHaveBeenCalledWith({ is_read: false, read_at: null });
    });

    it("returns a generic 500 when the update fails", async () => {
        mocks.db.update.mockReturnValue(queryChain(new Error("deadlock detected")));

        const response = await PATCH(json("PATCH", { ids: [1] }));

        expect(response.status).toBe(500);
        expect(JSON.stringify(await response.json())).not.toContain("deadlock");
    });
});
