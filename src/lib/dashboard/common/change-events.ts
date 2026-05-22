"use server";

import { DbTarget } from "@/lib/types";
import log from "@/utils/stdlog";

type DashboardChangeEvent = {
    target: DbTarget;
    occurredAt: string;
};

type DashboardListener = (event: DashboardChangeEvent) => void;

declare global {
    var __dashboardListeners: Set<DashboardListener> | undefined;
}

const listeners =
    globalThis.__dashboardListeners ?? new Set<DashboardListener>();

globalThis.__dashboardListeners = listeners;

/**
 * Broadcasts a dashboard table mutation event to all active listeners.
 */
export async function emitDashboardChange(target: DbTarget): Promise<void> {
    const event: DashboardChangeEvent = {
        target,
        occurredAt: new Date().toISOString(),
    };

    listeners.forEach((listener) => {
        try {
            listener(event);
        } catch (error) {
            log.error("Dashboard change listener failed", error);
        }
    });
}

/**
 * Registers a listener and returns an unsubscribe callback.
 */
export async function subscribeToDashboardChanges(
    listener: DashboardListener,
): Promise<() => void> {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
