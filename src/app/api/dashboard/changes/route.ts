import { subscribeToDashboardEvents } from "@/lib/dashboard/common/change-events";

/**
 * Creates a server-sent events stream that emits dashboard mutation updates.
 */
export async function GET(request: Request): Promise<Response> {
    let closed = false;
    let unsubscribe: (() => void) | null = null;
    let removeAbortListener: (() => void) | null = null;
    let keepAlive: ReturnType<typeof setInterval> | null = null;

    /**
     * Releases timer and listener resources for the current stream.
     */
    const cleanup = () => {
        if (closed) return;
        closed = true;

        if (keepAlive !== null) {
            clearInterval(keepAlive);
            keepAlive = null;
        }

        if (unsubscribe !== null) {
            unsubscribe();
            unsubscribe = null;
        }

        removeAbortListener?.();
        removeAbortListener = null;
    };

    const stream = new ReadableStream<Uint8Array>({
        /**
         * Starts the SSE stream and pushes dashboard change events.
         */
        async start(controller) {
            const encoder = new TextEncoder();

            const send = (frame: string) => {
                if (closed) return;

                try {
                    controller.enqueue(encoder.encode(frame));
                } catch {
                    // The client may have disconnected before the abort is observed.
                    cleanup();
                }
            };

            const handleAbort = () => {
                cleanup();
                try {
                    controller.close();
                } catch {
                    // The stream may already have been cancelled.
                }
            };

            request.signal.addEventListener("abort", handleAbort, { once: true });
            removeAbortListener = () => {
                request.signal.removeEventListener("abort", handleAbort);
            };

            if (request.signal.aborted) {
                handleAbort();
                return;
            }

            try {
                // Subscribe before announcing readiness so no event is lost in
                // the small gap between opening the stream and registering it.
                const stopListening = await subscribeToDashboardEvents((event) => {
                    send(`data: ${JSON.stringify(event)}\n\n`);
                });

                // The request may have been cancelled while subscription setup awaited.
                if (closed) {
                    stopListening();
                    return;
                }

                unsubscribe = stopListening;
                send("retry: 1000\n\n");
                send('data: {"type":"connected"}\n\n');

                keepAlive = setInterval(() => {
                    // SSE comments keep intermediaries from timing out the stream
                    // without producing application-level messages.
                    send(": keep-alive\n\n");
                }, 20_000);
            } catch (error) {
                cleanup();
                controller.error(error);
            }
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
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
