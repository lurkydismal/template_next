"use client";

type DashboardStreamMessage = {
    event?: string;
    type?: string;
};

type DashboardEventStreamOptions = Readonly<{
    onEvent: (event: DashboardStreamMessage) => void;
    /** Called after a failed connection has been restored. */
    onReconnect?: () => void;
}>;

const INITIAL_RETRY_DELAY = 1_000;
const MAX_RETRY_DELAY = 30_000;
const STABLE_CONNECTION_TIME = 5_000;

/**
 * Opens the dashboard SSE channel and restores it after connection failures.
 *
 * EventSource normally retries dropped connections itself, but it permanently
 * closes for some response failures (for example, an unavailable endpoint).
 * Recreating the source ourselves handles both cases consistently. Consumers
 * are notified after recovery so they can reload state that may have changed
 * while the stream was unavailable.
 */
export function connectDashboardEventStream({
    onEvent,
    onReconnect,
}: DashboardEventStreamOptions): () => void {
    let disposed = false;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stableTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempt = 0;
    let needsResync = false;

    const clearRetryTimer = () => {
        if (retryTimer !== null) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
    };

    const clearStableTimer = () => {
        if (stableTimer !== null) {
            clearTimeout(stableTimer);
            stableTimer = null;
        }
    };

    const scheduleReconnect = () => {
        if (disposed || retryTimer !== null || !navigator.onLine) return;

        const delay = Math.min(INITIAL_RETRY_DELAY * 2 ** retryAttempt, MAX_RETRY_DELAY);
        retryAttempt = Math.min(retryAttempt + 1, 6);
        // Spread retries from multiple clients to avoid reconnecting in lockstep.
        const jitteredDelay = Math.round(delay * (0.8 + Math.random() * 0.4));

        retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
        }, jitteredDelay);
    };

    const connect = () => {
        if (disposed || source !== null || !navigator.onLine) return;

        try {
            const nextSource = new EventSource("/api/dashboard/changes");
            source = nextSource;

            nextSource.onopen = () => {
                if (disposed || source !== nextSource) return;

                clearStableTimer();
                stableTimer = setTimeout(() => {
                    retryAttempt = 0;
                    stableTimer = null;
                }, STABLE_CONNECTION_TIME);

                if (needsResync) {
                    needsResync = false;
                    onReconnect?.();
                }
            };

            nextSource.onmessage = (message) => {
                if (disposed || source !== nextSource) return;

                try {
                    const payload: unknown = JSON.parse(message.data);
                    if (
                        payload !== null &&
                        typeof payload === "object" &&
                        !Array.isArray(payload)
                    ) {
                        onEvent(payload as DashboardStreamMessage);
                    }
                } catch {
                    // Ignore malformed frames and keep the connection alive.
                }
            };

            nextSource.onerror = () => {
                if (disposed || source !== nextSource) return;

                needsResync = true;
                clearStableTimer();
                nextSource.close();
                source = null;
                scheduleReconnect();
            };
        } catch {
            // EventSource construction can fail; retry just as for a stream error.
            needsResync = true;
            scheduleReconnect();
        }
    };

    const handleOffline = () => {
        clearRetryTimer();
        clearStableTimer();

        if (source !== null) {
            source.close();
            source = null;
            needsResync = true;
        }
    };

    const handleOnline = () => {
        clearRetryTimer();
        connect();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    connect();

    return () => {
        disposed = true;
        clearRetryTimer();
        clearStableTimer();
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("online", handleOnline);
        source?.close();
        source = null;
    };
}
