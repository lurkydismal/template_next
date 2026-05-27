"use server";

import { DbTarget } from "@/lib/types";
import log from "@/utils/stdlog";

type DashboardChangeEvent = {
    event: "dashboard-change";
    target: DbTarget;
    occurredAt: string;
};

type NotificationType = "default" | "success" | "error" | "warning" | "info";
type NotificationEvent = {
    event: "notification";
    type: NotificationType;
    message: string;
    notificationId: number;
    occurredAt: string;
};
type DashboardStreamEvent = DashboardChangeEvent | NotificationEvent;
type DashboardListener = (event: DashboardStreamEvent) => void;

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
        event: "dashboard-change",
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

/**
 * Broadcasts a persisted notification event to all active listeners.
 */
export async function emitNotificationEvent(event: NotificationEvent): Promise<void> {
    listeners.forEach((listener) => {
        try {
            listener(event);
        } catch (error) {
            log.error("Notification listener failed", error);
        }
    });
}

/**
 * Registers a notification listener and returns an unsubscribe callback.
 */
export async function subscribeToDashboardEvents(
    listener: DashboardListener,
): Promise<() => void> {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
