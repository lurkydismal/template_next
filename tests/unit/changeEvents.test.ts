import { afterEach, describe, expect, it, vi } from "vitest";

import {
    emitDashboardChange,
    emitNotificationEvent,
    subscribeToDashboardEvents,
} from "@/lib/dashboard/common/change-events";

describe("dashboard event bus", () => {
    const cleanup: Array<() => void> = [];

    afterEach(() => {
        cleanup.splice(0).forEach((unsubscribe) => unsubscribe());
    });

    it("delivers table-change events to active subscribers", async () => {
        const listener = vi.fn();
        cleanup.push(await subscribeToDashboardEvents(listener));

        await emitDashboardChange("tables");

        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
                event: "dashboard-change",
                target: "tables",
                occurredAt: expect.any(String),
            }),
        );
    });

    it("delivers notification events and stops after unsubscribe", async () => {
        const listener = vi.fn();
        const unsubscribe = await subscribeToDashboardEvents(listener);
        await emitNotificationEvent({
            event: "notification",
            type: "info",
            message: "New record",
            notificationId: 42,
            occurredAt: new Date().toISOString(),
        });

        expect(listener).toHaveBeenCalledOnce();
        unsubscribe();
        await emitDashboardChange("tables");
        expect(listener).toHaveBeenCalledOnce();
    });

    it("isolates listener failures so other subscribers still receive events", async () => {
        const broken = vi.fn(() => {
            throw new Error("listener failed");
        });
        const healthy = vi.fn();
        cleanup.push(await subscribeToDashboardEvents(broken));
        cleanup.push(await subscribeToDashboardEvents(healthy));

        await expect(emitDashboardChange("tables")).resolves.toBeUndefined();
        expect(healthy).toHaveBeenCalledOnce();
    });
});
