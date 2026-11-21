import type { ClipboardTtl } from "../types/ciphergen";

export interface ClipboardAdapter {
  writeText(text: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Detect whether the app is running inside a Tauri 2 webview.
 */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/**
 * Create a clipboard adapter that uses Tauri's native clipboard-manager plugin
 * when inside Tauri, or falls back to the browser Clipboard API in web preview.
 */
export function createRuntimeClipboardAdapter(): ClipboardAdapter {
  return {
    async writeText(text: string): Promise<void> {
      if (isTauriRuntime()) {
        const mod = await import("@tauri-apps/plugin-clipboard-manager");
        await mod.writeText(text);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    },
    async clear(): Promise<void> {
      if (isTauriRuntime()) {
        const mod = await import("@tauri-apps/plugin-clipboard-manager");
        try {
          await mod.clear();
        } catch {
          await mod.writeText("");
        }
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText("");
      }
    },
  };
}

export interface ClipboardTimerState {
  remainingSeconds: number;
  totalSeconds: ClipboardTtl;
  active: boolean;
}

/**
 * Manages copying secrets to the clipboard with deterministic auto-clear countdown.
 * Zero secrets are persisted to disk or localStorage.
 */
export class AutoClearClipboardController {
  private adapter: ClipboardAdapter;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private remaining = 0;
  private total: ClipboardTtl = 30;
  private onTick: (state: ClipboardTimerState) => void;

  constructor(
    adapter: ClipboardAdapter,
    onTick: (state: ClipboardTimerState) => void
  ) {
    this.adapter = adapter;
    this.onTick = onTick;
  }

  async copyWithAutoClear(text: string, ttlSeconds: ClipboardTtl): Promise<void> {
    this.stopTimer();
    await this.adapter.writeText(text);
    this.total = ttlSeconds;
    this.remaining = ttlSeconds;
    this.onTick({
      remainingSeconds: this.remaining,
      totalSeconds: this.total,
      active: true,
    });

    this.intervalId = setInterval(() => {
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.stopTimer();
        void this.adapter.clear();
        this.onTick({
          remainingSeconds: 0,
          totalSeconds: this.total,
          active: false,
        });
      } else {
        this.onTick({
          remainingSeconds: this.remaining,
          totalSeconds: this.total,
          active: true,
        });
      }
    }, 1000);
  }

  async clearNow(): Promise<void> {
    this.stopTimer();
    await this.adapter.clear();
    this.remaining = 0;
    this.onTick({
      remainingSeconds: 0,
      totalSeconds: this.total,
      active: false,
    });
  }

  dispose(): void {
    this.stopTimer();
  }

  private stopTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
