// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const offline = vi.hoisted(() => ({ value: false }));
vi.mock("next/offline", () => ({ useOffline: () => offline.value }));

import { useDashboardEventStream } from "../src/lib/dashboard/client-events";

class FakeEventSource {
    static instances: FakeEventSource[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((message: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;

    constructor(public url: string) {
        FakeEventSource.instances.push(this);
    }
    close() {
        this.closed = true;
    }
    open() {
        this.onopen?.();
    }
    emit(data: unknown) {
        this.onmessage?.({ data: typeof data === "string" ? data : JSON.stringify(data) });
    }
    fail() {
        this.onerror?.();
    }
    static get current() {
        return FakeEventSource.instances.at(-1)!;
    }
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5); // jitter factor 1.0 → deterministic delays
    FakeEventSource.instances = [];
    offline.value = false;
    vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

function mount(onEvent = vi.fn(), onReconnect = vi.fn()) {
    const hook = renderHook((props) => useDashboardEventStream(props), {
        initialProps: { onEvent, onReconnect },
    });
    return { ...hook, onEvent, onReconnect };
}

describe("useDashboardEventStream", () => {
    it("opens one stream to the dashboard changes endpoint", () => {
        mount();
        expect(FakeEventSource.instances).toHaveLength(1);
        expect(FakeEventSource.current.url).toBe("/api/dashboard/changes");
    });

    it("forwards parsed object payloads to onEvent", () => {
        const { onEvent } = mount();
        FakeEventSource.current.open();

        act(() => FakeEventSource.current.emit({ event: "dashboard-change", target: "tables" }));
        act(() => FakeEventSource.current.emit({ type: "connected" }));

        expect(onEvent).toHaveBeenNthCalledWith(1, { event: "dashboard-change", target: "tables" });
        expect(onEvent).toHaveBeenNthCalledWith(2, { type: "connected" });
    });

    it("ignores malformed, array and primitive frames without dropping the connection", () => {
        const { onEvent } = mount();

        act(() => FakeEventSource.current.emit("{broken"));
        act(() => FakeEventSource.current.emit("[1,2]"));
        act(() => FakeEventSource.current.emit("42"));
        act(() => FakeEventSource.current.emit("null"));

        expect(onEvent).not.toHaveBeenCalled();
        expect(FakeEventSource.current.closed).toBe(false);
    });

    it("does not report a reconnect for the first successful connection", () => {
        const { onReconnect } = mount();
        FakeEventSource.current.open();
        expect(onReconnect).not.toHaveBeenCalled();
    });

    it("retries after an error with exponential backoff and then asks consumers to resync", () => {
        const { onReconnect } = mount();
        const first = FakeEventSource.current;

        act(() => first.fail());
        expect(first.closed).toBe(true);
        expect(FakeEventSource.instances).toHaveLength(1);

        act(() => vi.advanceTimersByTime(999));
        expect(FakeEventSource.instances).toHaveLength(1);
        act(() => vi.advanceTimersByTime(1));
        expect(FakeEventSource.instances).toHaveLength(2); // after 1s

        act(() => FakeEventSource.current.fail());
        act(() => vi.advanceTimersByTime(1_999));
        expect(FakeEventSource.instances).toHaveLength(2);
        act(() => vi.advanceTimersByTime(1));
        expect(FakeEventSource.instances).toHaveLength(3); // after 2s (doubled)

        expect(onReconnect).not.toHaveBeenCalled();
        act(() => FakeEventSource.current.open());
        expect(onReconnect).toHaveBeenCalledTimes(1);

        // Further opens without a failure in between must not trigger another resync.
        act(() => FakeEventSource.current.open());
        expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it("caps the backoff at 30 seconds", () => {
        mount();
        for (let attempt = 0; attempt < 10; attempt++) {
            act(() => FakeEventSource.current.fail());
            act(() => vi.advanceTimersByTime(30_000));
        }
        const count = FakeEventSource.instances.length;
        act(() => FakeEventSource.current.fail());
        act(() => vi.advanceTimersByTime(29_999));
        expect(FakeEventSource.instances).toHaveLength(count);
        act(() => vi.advanceTimersByTime(1));
        expect(FakeEventSource.instances).toHaveLength(count + 1);
    });

    it("resets the backoff once a connection has been stable for 5 seconds", () => {
        mount();
        act(() => FakeEventSource.current.fail());
        act(() => vi.advanceTimersByTime(1_000));
        act(() => FakeEventSource.current.fail());
        act(() => vi.advanceTimersByTime(2_000));

        act(() => FakeEventSource.current.open());
        act(() => vi.advanceTimersByTime(5_000)); // stable
        const count = FakeEventSource.instances.length;
        act(() => FakeEventSource.current.fail());
        act(() => vi.advanceTimersByTime(1_000)); // back to the initial delay
        expect(FakeEventSource.instances).toHaveLength(count + 1);
    });

    it("closes the stream when the browser goes offline and resyncs when it returns", () => {
        const { rerender, onEvent, onReconnect } = mount();
        const offlineSource = FakeEventSource.current;

        offline.value = true;
        rerender({ onEvent, onReconnect });
        expect(offlineSource.closed).toBe(true);
        expect(FakeEventSource.instances).toHaveLength(1);

        offline.value = false;
        rerender({ onEvent, onReconnect });
        expect(FakeEventSource.instances).toHaveLength(2);
        act(() => FakeEventSource.current.open());
        expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it("resyncs after coming online even if the stream never opened while offline", () => {
        offline.value = true;
        const { rerender, onEvent, onReconnect } = mount();
        expect(FakeEventSource.instances).toHaveLength(0);

        offline.value = false;
        rerender({ onEvent, onReconnect });
        act(() => FakeEventSource.current.open());

        expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it("uses the latest callbacks without reconnecting", () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender, onReconnect } = mount(first);

        rerender({ onEvent: second, onReconnect });
        act(() => FakeEventSource.current.emit({ event: "dashboard-change" }));

        expect(FakeEventSource.instances).toHaveLength(1);
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it("tears down the stream and pending timers on unmount", () => {
        const { unmount } = mount();
        const source = FakeEventSource.current;
        act(() => source.fail());

        unmount();
        act(() => vi.advanceTimersByTime(60_000));

        expect(FakeEventSource.instances).toHaveLength(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it("closes an open stream on unmount and ignores late frames", () => {
        const { unmount, onEvent } = mount();
        const source = FakeEventSource.current;
        source.open();

        unmount();
        source.emit({ event: "dashboard-change" });

        expect(source.closed).toBe(true);
        expect(onEvent).not.toHaveBeenCalled();
    });

    it("retries when EventSource construction throws", () => {
        let throws = true;
        vi.stubGlobal(
            "EventSource",
            class extends FakeEventSource {
                constructor(url: string) {
                    if (throws) throw new Error("blocked");
                    super(url);
                }
            },
        );
        const { onReconnect } = mount();
        expect(FakeEventSource.instances).toHaveLength(0);

        throws = false;
        act(() => vi.advanceTimersByTime(1_000));
        expect(FakeEventSource.instances).toHaveLength(1);
        act(() => FakeEventSource.current.open());
        expect(onReconnect).toHaveBeenCalledTimes(1);
    });
});
