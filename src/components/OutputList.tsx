import {
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Timer,
  Trash2,
  Layers,
} from "lucide-react";
import type { ClipboardTimerState } from "../lib/clipboard";
import type { ClipboardTtl, GeneratedItem } from "../types/ciphergen";

interface OutputListProps {
  items: GeneratedItem[];
  batchCount: number;
  onBatchCountChange: (count: number) => void;
  masked: boolean;
  onToggleMask: () => void;
  clipboardTtl: ClipboardTtl;
  onClipboardTtlChange: (ttl: ClipboardTtl) => void;
  timerState: ClipboardTimerState;
  copiedIndex: number | "all" | null;
  onCopyItem: (value: string, index: number) => void;
  onCopyAll: () => void;
  onClearClipboard: () => void;
  onRegenerate: () => void;
}

function renderHighlightedSecret(value: string, masked: boolean) {
  if (masked) {
    return (
      <span className="tracking-widest text-slate-400">
        {"•".repeat(Math.min(value.length, 36))}
      </span>
    );
  }

  return [...value].map((ch, idx) => {
    if (/[0-9]/.test(ch)) {
      return (
        <span key={idx} className="text-cyan-300">
          {ch}
        </span>
      );
    }
    if (/[^a-zA-Z0-9\s]/.test(ch)) {
      return (
        <span key={idx} className="text-amber-300">
          {ch}
        </span>
      );
    }
    return (
      <span key={idx} className="text-slate-100">
        {ch}
      </span>
    );
  });
}

export function OutputList({
  items,
  batchCount,
  onBatchCountChange,
  masked,
  onToggleMask,
  clipboardTtl,
  onClipboardTtlChange,
  timerState,
  copiedIndex,
  onCopyItem,
  onCopyAll,
  onClearClipboard,
  onRegenerate,
}: OutputListProps) {
  const progressPct = timerState.active
    ? Math.max(0, (timerState.remainingSeconds / timerState.totalSeconds) * 100)
    : 0;

  return (
    <section className="cyber-panel cyber-accent-ring rounded-2xl p-4 sm:p-5">
      {/* Top toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="cyber-elevated flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Lote:</span>
            <select
              aria-label="Cantidad en lote"
              value={batchCount}
              onChange={(e) => onBatchCountChange(Number(e.target.value))}
              className="bg-transparent font-mono font-bold text-slate-100 outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-slate-100">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="cyber-elevated flex items-center gap-1 rounded-lg px-2 py-1 text-xs">
            <Timer className="ml-0.5 h-3.5 w-3.5 text-slate-400" />
            <span className="hidden text-slate-400 sm:inline">Auto-limpiar:</span>
            {([15, 30, 60] as const).map((ttl) => (
              <button
                key={ttl}
                type="button"
                onClick={() => onClipboardTtlChange(ttl)}
                className={`rounded px-1.5 py-0.5 font-mono text-[11px] transition ${
                  clipboardTtl === ttl
                    ? "bg-white/15 font-bold text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {ttl}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMask}
            title={masked ? "Mostrar secretos" : "Ocultar secretos"}
            className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
          >
            {masked ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {masked ? "Mostrar" : "Ocultar"}
            </span>
          </button>

          {items.length > 1 && (
            <button
              type="button"
              onClick={onCopyAll}
              className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600"
            >
              {copiedIndex === "all" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>Copiar lote</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Regenerar</span>
          </button>
        </div>
      </div>

      {/* Generated items list */}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const isCopied = copiedIndex === idx;
          return (
            <div
              key={`${idx}-${item.value.slice(0, 8)}`}
              className="cyber-elevated group flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 transition hover:border-slate-600/80"
            >
              <div className="min-w-0 flex-1">
                {items.length > 1 && (
                  <span className="mr-2 font-mono text-[11px] text-slate-500">
                    #{idx + 1}
                  </span>
                )}
                <code className="font-mono-secret break-all text-sm font-medium leading-relaxed sm:text-base">
                  {renderHighlightedSecret(item.value, masked)}
                </code>
              </div>

              <button
                type="button"
                onClick={() => onCopyItem(item.value, idx)}
                aria-label={`Copiar elemento ${idx + 1}`}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white active:scale-95"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Clipboard auto-clear countdown banner */}
      {timerState.active && (
        <div className="mt-3 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-950/25">
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-emerald-300">
              Portapapeles se limpiará automáticamente en{" "}
              <strong className="font-mono">{timerState.remainingSeconds}s</strong>
            </span>
            <button
              type="button"
              onClick={onClearClipboard}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
            >
              <Trash2 className="h-3 w-3" />
              Limpiar ahora
            </button>
          </div>
          <div className="h-1 w-full bg-slate-900">
            <div
              className="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
