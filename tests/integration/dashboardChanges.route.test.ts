import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getRequestSession: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getRequestSession: mocks.getRequestSession }));

import { GET } from "@/app/api/dashboard/changes/route";
import { emitDashboardChange } from "@/lib/dashboard/common/change-events";

describe("GET /api/dashboard/changes", () => {
    beforeEach(() => {
        mocks.getRequestSession.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("rejects anonymous clients before creating an event stream", async () => {
        mocks.getRequestSession.mockResolvedValue(null);

        const response = await GET(new Request("http://localhost/api/dashboard/changes"));

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Authentication is required" });
    });

    it("streams connect and table-change frames to authenticated clients", async () => {
        mocks.getRequestSession.mockResolvedValue({ user: { id: "user-1" } });
        const controller = new AbortController();
        const response = await GET(
            new Request("http://localhost/api/dashboard/changes", { signal: controller.signal }),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/event-stream");

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let initialFrame = "";
        while (!initialFrame.includes('data: {"type":"connected"}')) {
            const part = await reader.read();
            initialFrame += decoder.decode(part.value);
        }
        expect(initialFrame).toContain("retry: 1000");

        const nextFrame = reader.read();
        await emitDashboardChange("tables");
        const changed = await nextFrame;
        const frame = decoder.decode(changed.value);
        expect(frame).toContain('"event":"dashboard-change"');
        expect(frame).toContain('"target":"tables"');

        controller.abort();
        await reader.read();
        reader.releaseLock();
    });
});
