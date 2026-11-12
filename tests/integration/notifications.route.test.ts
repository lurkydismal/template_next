import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    getRequestSession: vi.fn(),
    insert: vi.fn(),
    insertValues: vi.fn(),
    insertReturning: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    updateSet: vi.fn(),
    updateWhere: vi.fn(),
    emitNotification: vi.fn(),
    logError: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getRequestSession: mocks.getRequestSession }));
vi.mock("@/db", () => ({
    default: {
        insert: mocks.insert,
        select: mocks.select,
        update: mocks.update,
    },
}));
vi.mock("@/lib/dashboard/common/change-events", () => ({
    emitDashboardChange: vi.fn(),
    emitNotificationEvent: mocks.emitNotification,
}));
vi.mock("@/utils/stdlog", () => ({
    default: { error: mocks.logError, debug: vi.fn(), trace: vi.fn(), info: vi.fn() },
}));

import { GET, PATCH, POST } from "@/app/api/notifications/route";

const request = (method: string, body?: unknown) =>
    new Request("http://localhost/api/notifications", {
        method,
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

describe("notification route authorization and validation", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.getRequestSession.mockResolvedValue(null);
    });

    it("rejects anonymous GET, POST, and PATCH requests", async () => {
        const get = await GET(request("GET"));
        const post = await POST(request("POST", { message: "hello" }));
        const patch = await PATCH(request("PATCH", { ids: [1] }));

        expect([get.status, post.status, patch.status]).toEqual([401, 401, 401]);
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it("returns notifications and unread count to an authenticated user", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
        const rows = [
            { id: 1, type: "info", message: "One", is_read: false },
            { id: 2, type: "success", message: "Two", is_read: true },
        ];
        mocks.select.mockImplementation(() => {
            const callIndex = mocks.select.mock.calls.length - 1;
            return {
                from: () => ({
                    orderBy: () => Promise.resolve(rows),
                    where: () => Promise.resolve([{ total: callIndex === 1 ? 1 : 0 }]),
                }),
            };
        });

        const response = await GET(request("GET"));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ rows, unreadCount: 1 });
        expect(mocks.select).toHaveBeenCalledTimes(2);
    });

    it("rejects malformed JSON before touching the database", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
        const response = await POST(
            new Request("http://localhost/api/notifications", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{invalid-json",
            }),
        );

        expect(response.status).toBe(400);
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it("validates notification type and non-empty message", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
        const invalidType = await POST(request("POST", { type: "fatal", message: "hello" }));
        const missingMessage = await POST(request("POST", { type: "info", message: "  " }));

        expect(invalidType.status).toBe(400);
        expect(missingMessage.status).toBe(400);
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it("persists valid notifications and broadcasts the committed record", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
        const created = {
            id: 7,
            type: "success",
            message: "Saved",
            is_read: false,
            read_at: null,
            created_at: new Date("2026-11-12T00:00:00.000Z"),
        };
        mocks.insertReturning.mockResolvedValue([created]);
        mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning });
        mocks.insert.mockReturnValue({ values: mocks.insertValues });
        mocks.emitNotification.mockResolvedValue(undefined);

        const response = await POST(request("POST", { type: "success", message: "  Saved  " }));

        expect(response.status).toBe(201);
        expect(await response.json()).toMatchObject({
            id: 7,
            type: "success",
            message: "Saved",
            created_at: "2026-11-12T00:00:00.000Z",
        });
        expect(mocks.insertValues).toHaveBeenCalledWith({ type: "success", message: "Saved" });
        expect(mocks.emitNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                event: "notification",
                notificationId: 7,
                type: "success",
                message: "Saved",
            }),
        );
    });

    it("marks deduplicated notification IDs unread and clears read timestamps", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
        mocks.updateWhere.mockResolvedValue(undefined);
        mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
        mocks.update.mockReturnValue({ set: mocks.updateSet });

        const response = await PATCH(request("PATCH", { ids: [4, 4, 8], isRead: false }));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
        expect(mocks.updateSet).toHaveBeenCalledWith({ is_read: false, read_at: null });
        expect(mocks.updateWhere).toHaveBeenCalledOnce();
    });

    it("rejects a non-boolean isRead value without issuing an update", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });

        const response = await PATCH(request("PATCH", { ids: [4], isRead: "false" }));

        expect(response.status).toBe(400);
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it("rejects PATCH payloads without positive notification IDs", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
        const response = await PATCH(request("PATCH", { ids: [0, -1, "2", null] }));
        expect(response.status).toBe(400);
        expect(mocks.update).not.toHaveBeenCalled();
    });
});
