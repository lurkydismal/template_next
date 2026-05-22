import { DbTarget } from "@/lib/types";

type DashboardChangeEvent = {
    target: DbTarget;
    occurredAt: string;
};

type DashboardListener = (event: DashboardChangeEvent) => void;

const listeners = new Set<DashboardListener>();

/**
 * Broadcasts a dashboard table mutation event to all active listeners.
 */
export function emitDashboardChange(target: DbTarget): void {
    const event: DashboardChangeEvent = {
        target,
        occurredAt: new Date().toISOString(),
    };

    listeners.forEach((listener) => {
        try {
            listener(event);
        } catch (error) {
            console.error("Dashboard change listener failed", error);
        }
    });
}

/**
 * Registers a listener and returns an unsubscribe callback.
 */
export function subscribeToDashboardChanges(
    listener: DashboardListener,
): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
