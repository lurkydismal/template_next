"use client";

import { useOffline } from "next/offline";
import { useEffect, useRef } from "react";

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
 * Next.js' `useOffline` hook owns browser connectivity detection. SSE failures
 * still use their own retry loop because EventSource requests are not covered
 * by Next.js' navigation/Server Action retry handling. Consumers are notified
 * after recovery so they can reload state that may have changed while offline.
 */
export function useDashboardEventStream({
    onEvent,
    onReconnect,
}: DashboardEventStreamOptions): void {
    const isOffline = useOffline();
    const callbacksRef = useRef({ onEvent, onReconnect });
    const needsResyncRef = useRef(false);

    // Keep callbacks current without reconnecting the stream when they change.
    useEffect(() => {
        callbacksRef.current = { onEvent, onReconnect };
    }, [onEvent, onReconnect]);

    useEffect(() => {
        if (isOffline) {
            // The initial data fetch may also have failed while offline. Refresh
            // after the SSE stream is established again, even if it never opened.
            needsResyncRef.current = true;
            return;
        }

        let disposed = false;
        let source: EventSource | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let stableTimer: ReturnType<typeof setTimeout> | null = null;
        let retryAttempt = 0;

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
            if (disposed || retryTimer !== null) return;

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
            if (disposed || source !== null) return;

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

                    if (needsResyncRef.current) {
                        needsResyncRef.current = false;
                        callbacksRef.current.onReconnect?.();
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
                            callbacksRef.current.onEvent(payload as DashboardStreamMessage);
                        }
                    } catch {
                        // Ignore malformed frames and keep the connection alive.
                    }
                };

                nextSource.onerror = () => {
                    if (disposed || source !== nextSource) return;

                    needsResyncRef.current = true;
                    clearStableTimer();
                    nextSource.close();
                    source = null;
                    scheduleReconnect();
                };
            } catch {
                // EventSource construction can fail; retry just as for a stream error.
                needsResyncRef.current = true;
                scheduleReconnect();
            }
        };

        connect();

        return () => {
            disposed = true;
            clearRetryTimer();
            clearStableTimer();

            if (source !== null) {
                // This cleanup also runs when `useOffline` changes to true.
                needsResyncRef.current = true;
                source.close();
                source = null;
            }
        };
    }, [isOffline]);
}
