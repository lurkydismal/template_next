import {
    subscribeToDashboardChanges,
    subscribeToNotifications,
} from "@/lib/dashboard/common/change-events";

/**
 * Creates a server-sent events stream that emits dashboard mutation updates.
 */
export async function GET(): Promise<Response> {
    let unsubscribe: (() => void) | null = null;
    let unsubscribeNotifications: (() => void) | null = null;
    let keepAlive: ReturnType<typeof setInterval> | null = null;

    /**
     * Releases timer and listener resources for the current stream.
     */
    const cleanup = () => {
        if (keepAlive) {
            clearInterval(keepAlive);
            keepAlive = null;
        }

        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        if (unsubscribeNotifications) {
            unsubscribeNotifications();
            unsubscribeNotifications = null;
        }
    };

    const stream = new ReadableStream<Uint8Array>({
        /**
         * Starts the SSE stream and pushes dashboard change events.
         */
        async start(controller) {
            const encoder = new TextEncoder();

            /**
             * Serializes and sends an SSE data frame.
             */
            const send = (payload: unknown) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
                    );
                } catch {
                    cleanup();

                    try {
                        controller.close();
                    } catch {
                        // Stream is already closed/cancelled.
                    }
                }
            };

            send({ type: "connected" });

            unsubscribe = await subscribeToDashboardChanges((event) => {
                send({ event: "dashboard-change", ...event });
            });
            unsubscribeNotifications = await subscribeToNotifications((event) => {
                send({ event: "notification", ...event });
            });

            keepAlive = setInterval(() => {
                send({ type: "keepalive" });
            }, 25_000);
        },
        /**
         * Cleans up resources when the client disconnects.
         */
        cancel() {
            cleanup();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
