import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/stdlog", () => ({
    default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import {
    emitDashboardChange,
    emitNotificationEvent,
    subscribeToDashboardEvents,
} from "../src/lib/dashboard/common/change-events";

const registry = () => globalThis.__dashboardListeners!;
const unsubscribers: Array<() => void> = [];

async function listen(listener: (event: unknown) => void) {
    const stop = await subscribeToDashboardEvents(listener as never);
    unsubscribers.push(stop);
    return stop;
}

afterEach(() => {
    while (unsubscribers.length) unsubscribers.pop()!();
    vi.useRealTimers();
});

describe("dashboard event bus", () => {
    it("delivers a timestamped dashboard-change event to every subscriber", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-12T10:00:00.000Z"));
        const a = vi.fn();
        const b = vi.fn();
        await listen(a);
        await listen(b);

        await emitDashboardChange("tables");

        const expected = {
            event: "dashboard-change",
            target: "tables",
            occurredAt: "2026-11-12T10:00:00.000Z",
        };
        expect(a).toHaveBeenCalledExactlyOnceWith(expected);
        expect(b).toHaveBeenCalledExactlyOnceWith(expected);
    });

    it("delivers notification events unchanged", async () => {
        const listener = vi.fn();
        await listen(listener);
        const event = {
            event: "notification" as const,
            type: "info" as const,
            message: "hello",
            notificationId: 3,
            occurredAt: "2026-11-12T10:00:00.000Z",
        };

        await emitNotificationEvent(event);

        expect(listener).toHaveBeenCalledExactlyOnceWith(event);
    });

    it("stops delivering after unsubscribe and releases the listener", async () => {
        const listener = vi.fn();
        const before = registry().size;
        const stop = await listen(listener);
        expect(registry().size).toBe(before + 1);

        stop();
        await emitDashboardChange("tables");

        expect(listener).not.toHaveBeenCalled();
        expect(registry().size).toBe(before);
    });

    it("isolates a failing listener from the others", async () => {
        const bad = vi.fn(() => {
            throw new Error("boom");
        });
        const good = vi.fn();
        await listen(bad);
        await listen(good);

        await expect(emitDashboardChange("tables")).resolves.toBeUndefined();

        expect(bad).toHaveBeenCalledTimes(1);
        expect(good).toHaveBeenCalledTimes(1);
    });

    it("shares one registry across module reloads (HMR / duplicated bundles)", async () => {
        const listener = vi.fn();
        await listen(listener);

        vi.resetModules();
        const reloaded = await import("../src/lib/dashboard/common/change-events");
        await reloaded.emitDashboardChange("tables");

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
