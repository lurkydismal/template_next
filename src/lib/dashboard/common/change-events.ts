"use server";

import { DbTarget } from "@/lib/types";
import log from "@/utils/stdlog";

type DashboardChangeEvent = {
    target: DbTarget;
    occurredAt: string;
};

type DashboardListener = (event: DashboardChangeEvent) => void;
type NotificationType = "default" | "success" | "error" | "warning" | "info";
type NotificationEvent = {
    type: NotificationType;
    message: string;
    notificationId: number;
    occurredAt: string;
};
type NotificationListener = (event: NotificationEvent) => void;

declare global {
    var __dashboardListeners: Set<DashboardListener> | undefined;
    var __notificationListeners: Set<NotificationListener> | undefined;
}

const listeners =
    globalThis.__dashboardListeners ?? new Set<DashboardListener>();

globalThis.__dashboardListeners = listeners;
const notificationListeners =
    globalThis.__notificationListeners ?? new Set<NotificationListener>();
globalThis.__notificationListeners = notificationListeners;

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

/**
 * Broadcasts a persisted notification event to all active listeners.
 */
export async function emitNotificationEvent(event: NotificationEvent): Promise<void> {
    notificationListeners.forEach((listener) => {
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
export async function subscribeToNotifications(
    listener: NotificationListener,
): Promise<() => void> {
    notificationListeners.add(listener);

    return () => {
        notificationListeners.delete(listener);
    };
}
