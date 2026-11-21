import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AutoClearClipboardController,
  type ClipboardAdapter,
  type ClipboardTimerState,
} from "../lib/clipboard";

describe("AutoClearClipboardController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes to clipboard and automatically clears after configured TTL (15s)", async () => {
    const writeText = vi.fn(async () => {});
    const clear = vi.fn(async () => {});
    const adapter: ClipboardAdapter = { writeText, clear };

    const ticks: ClipboardTimerState[] = [];
    const ctrl = new AutoClearClipboardController(adapter, (state) => {
      ticks.push(state);
    });

    await ctrl.copyWithAutoClear("SuperSecret!2026", 15);
    expect(writeText).toHaveBeenCalledWith("SuperSecret!2026");
    expect(clear).not.toHaveBeenCalled();
    expect(ticks.at(-1)).toEqual({
      remainingSeconds: 15,
      totalSeconds: 15,
      active: true,
    });

    vi.advanceTimersByTime(14_000);
    expect(clear).not.toHaveBeenCalled();
    expect(ticks.at(-1)?.remainingSeconds).toBe(1);

    vi.advanceTimersByTime(1_000);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(ticks.at(-1)).toEqual({
      remainingSeconds: 0,
      totalSeconds: 15,
      active: false,
    });

    ctrl.dispose();
  });

  it("clears immediately when clearNow() is invoked and cancels pending timer", async () => {
    const writeText = vi.fn(async () => {});
    const clear = vi.fn(async () => {});
    const adapter: ClipboardAdapter = { writeText, clear };

    const ctrl = new AutoClearClipboardController(adapter, () => {});
    await ctrl.copyWithAutoClear("AnotherSecret", 60);
    await ctrl.clearNow();

    expect(clear).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(clear).toHaveBeenCalledTimes(1);
    ctrl.dispose();
  });
});
