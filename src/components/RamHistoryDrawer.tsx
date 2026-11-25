import { useState } from "react";
import {
  History,
  Eye,
  EyeOff,
  Copy,
  Check,
  QrCode,
  Radio,
  Trash2,
  X,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import type { RamHistoryEntry } from "../types/ciphergen";
import { NatoSpellingView } from "./NatoSpellingView";

interface RamHistoryDrawerProps {
  entries: RamHistoryEntry[];
  recording: boolean;
  onToggleRecording: () => void;
  onCopy: (value: string) => void;
  onShowQr: (value: string, label: string, entropyBits: number) => void;
  onRemoveEntry: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function RamHistoryDrawer({
  entries,
  recording,
  onToggleRecording,
  onCopy,
  onShowQr,
  onRemoveEntry,
  onClearAll,
  onClose,
}: RamHistoryDrawerProps) {
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [natoId, setNatoId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (entry: RamHistoryEntry) => {
    onCopy(entry.value);
    setCopiedId(entry.id);
    setTimeout(() => {
      setCopiedId((cur) => (cur === entry.id ? null : cur));
    }, 1600);
  };

  return (
    <section className="cyber-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              Historial Efímero en RAM ({entries.length}/20)
            </h2>
            <p className="text-[11px] text-slate-400">
              Vive únicamente en memoria volátil. Se destruye al cerrar, minimizar con
              auto-bloqueo o pulsar Esc.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleRecording}
            className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
            title={
              recording
                ? "Pausar registro en RAM"
                : "Reanudar registro en RAM"
            }
          >
            {recording ? (
              <>
                <PauseCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Activo</span>
              </>
            ) : (
              <>
                <PlayCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Pausado</span>
              </>
            )}
          </button>

          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="cyber-elevated inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:border-rose-500/50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Vaciar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar historial en RAM"
            className="cyber-elevated rounded-lg p-1.5 text-slate-400 transition hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="cyber-elevated rounded-xl px-4 py-6 text-center text-xs text-slate-400">
          {recording
            ? "Aún no hay secretos registrados en esta sesión. Cada clave generada o derivada aparecerá aquí temporalmente."
            : "Registro en RAM pausado. Cero historial en memoria."}
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {entries.map((entry) => {
            const revealed = Boolean(revealedIds[entry.id]);
            const showNato = natoId === entry.id;
            const isCopied = copiedId === entry.id;

            return (
              <div
                key={entry.id}
                className="cyber-elevated rounded-xl px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className="rounded-full px-2 py-0.5 font-semibold"
                        style={{
                          background: "var(--accent-glow)",
                          color: "var(--accent)",
                        }}
                      >
                        {entry.modeLabel}
                      </span>
                      {entry.meta && (
                        <span className="font-medium text-slate-300">
                          {entry.meta}
                        </span>
                      )}
                      <span className="font-mono text-slate-500">
                        {entry.entropyBits.toFixed(1)} bits
                      </span>
                      <span className="text-slate-500">• {entry.createdAt}</span>
                    </div>

                    <code className="font-mono-secret block break-all text-xs text-slate-200">
                      {revealed
                        ? entry.value
                        : "•".repeat(Math.min([...entry.value].length, 28))}
                    </code>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleReveal(entry.id)}
                      title={revealed ? "Ocultar" : "Mostrar"}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      {revealed ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onShowQr(entry.value, entry.modeLabel, entry.entropyBits)
                      }
                      title="Mostrar código QR offline"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNatoId((cur) => (cur === entry.id ? null : entry.id))
                      }
                      title="Deletreo fonético NATO"
                      className={`rounded-lg p-1.5 transition hover:bg-white/10 ${
                        showNato ? "text-cyan-300" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Radio className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(entry)}
                      title="Copiar con auto-limpieza"
                      className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveEntry(entry.id)}
                      title="Eliminar de RAM"
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {showNato && (
                  <NatoSpellingView value={entry.value} onCopyNato={onCopy} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
