import { useState } from "react";
import {
  Activity,
  Atom,
  Cpu,
  GlobeLock,
  Shield,
  Sparkles,
  Search,
  AlertTriangle,
} from "lucide-react";
import type { SecurityAnalysis, SecurityLevel } from "../types/ciphergen";

interface SecurityAnalysisPanelProps {
  analysis: SecurityAnalysis;
  customSecret: string;
  onCustomSecretChange: (val: string) => void;
  customAnalysis: SecurityAnalysis | null;
  hideInlineInspector?: boolean;
}

const LEVEL_STYLES: Record<
  SecurityLevel,
  { badge: string; bar: string; text: string }
> = {
  weak: {
    badge: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    bar: "bg-rose-500",
    text: "text-rose-400",
  },
  fair: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    bar: "bg-amber-400",
    text: "text-amber-300",
  },
  strong: {
    badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    bar: "bg-sky-400",
    text: "text-sky-300",
  },
  ultraStrong: {
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    bar: "bg-emerald-400",
    text: "text-emerald-300",
  },
  postQuantum: {
    badge: "border-cyan-400/50 bg-cyan-400/15 text-cyan-200",
    bar: "bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300",
    text: "text-cyan-300",
  },
};

export function SecurityAnalysisPanel({
  analysis,
  customSecret,
  onCustomSecretChange,
  customAnalysis,
  hideInlineInspector = false,
}: SecurityAnalysisPanelProps) {
  const [inspectOpen, setInspectOpen] = useState(false);
  const active =
    !hideInlineInspector && inspectOpen && customAnalysis
      ? customAnalysis
      : analysis;
  const styles = LEVEL_STYLES[active.level];
  const hasPenalties = active.penalties && active.penalties.length > 0;
  const lostBits = Math.max(
    0,
    (active.theoreticalEntropyBits ?? active.entropyBits) - active.entropyBits
  );

  return (
    <section className="cyber-panel space-y-4 rounded-2xl p-4 sm:p-5">
      {/* Header & classification */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-bold tracking-tight">
            Análisis Criptográfico en Tiempo Real
          </h2>
        </div>

        {!hideInlineInspector && (
          <button
            type="button"
            onClick={() => setInspectOpen((v) => !v)}
            className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:text-white"
          >
            <Search className="h-3 w-3" />
            <span>{inspectOpen ? "Ver generador" : "Analizar clave propia"}</span>
          </button>
        )}
      </div>

      {!hideInlineInspector && inspectOpen && (
        <div className="space-y-1.5">
          <input
            type="text"
            value={customSecret}
            onChange={(e) => onCustomSecretChange(e.target.value)}
            placeholder="Escribe o pega una contraseña aquí para analizarla 100% en local..."
            autoComplete="off"
            spellCheck={false}
            className="cyber-elevated font-mono-secret w-full rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
          />
          <p className="text-[11px] text-slate-500">
            Nunca sale de tu dispositivo ni se guarda en disco.
          </p>
        </div>
      )}

      {/* Entropy headline + progress bar */}
      <div className="cyber-elevated rounded-xl p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {hasPenalties
                ? "Entropía Real Penalizada"
                : "Entropía Real Exacta"}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
              <span className={`font-mono text-2xl font-extrabold ${styles.text}`}>
                {active.entropyBits.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">
                bits
                {hasPenalties && lostBits > 0.5 && (
                  <span className="ml-1.5 rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-rose-300">
                    teórica: {active.theoreticalEntropyBits.toFixed(1)} (−
                    {lostBits.toFixed(1)}b)
                  </span>
                )}
                {" • "}Alfabeto efectivo:{" "}
                <strong className="font-mono text-slate-200">
                  {active.alphabetSize.toLocaleString("es-ES")}
                </strong>
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${styles.badge}`}
          >
            {active.level === "postQuantum" && <Sparkles className="h-3.5 w-3.5" />}
            {active.levelLabel}
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900">
          <div
            className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
            style={{ width: `${Math.max(4, active.scorePercent)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
          <span>Débil (&lt;50)</span>
          <span>Aceptable (50+)</span>
          <span>Fuerte (80+)</span>
          <span>Ultra (128+)</span>
          <span>Post-Cuántica (≥256)</span>
        </div>
      </div>

      {/* Penalties breakdown (when custom password has detectable weaknesses) */}
      {hasPenalties && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-950/20 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Patrones y Penalizaciones Detectadas ({active.penalties.length})
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-rose-300">
              −{lostBits.toFixed(1)} bits reales
            </span>
          </div>
          <div className="space-y-2">
            {active.penalties.map((p, i) => (
              <div
                key={`${p.code}-${i}`}
                className="rounded-lg border border-rose-500/20 bg-black/20 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-rose-200">{p.label}</span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                    −{p.bitsLost.toFixed(1)} bits
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                  {p.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crack time estimates */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="cyber-elevated rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <GlobeLock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Online (Rate-Limit)</span>
          </div>
          <div className="mt-1.5 font-mono text-xs font-bold text-slate-100 sm:text-sm">
            {active.crackTimes.onlineThrottled}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            100 intentos / hora
          </div>
        </div>

        <div className="cyber-elevated rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Cpu className="h-3.5 w-3.5 text-rose-400" />
            <span>Clúster GPU (Hash Rápido)</span>
          </div>
          <div className="mt-1.5 font-mono text-xs font-bold text-slate-100 sm:text-sm">
            {active.crackTimes.gpuFastHash}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            100 GH/s (SHA-256 / NTLM)
          </div>
        </div>

        <div className="cyber-elevated rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Shield className="h-3.5 w-3.5 text-cyan-400" />
            <span>Clúster GPU (Argon2id)</span>
          </div>
          <div className="mt-1.5 font-mono text-xs font-bold text-slate-100 sm:text-sm">
            {active.crackTimes.gpuArgon2id}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            10 kH/s (KDF memory-hard)
          </div>
        </div>
      </div>

      {/* Quantum Grover margin */}
      <div
        className={`rounded-xl border p-3.5 ${
          active.quantumGrover.isPostQuantumSafe
            ? "border-cyan-400/35 bg-cyan-950/20"
            : "border-slate-700/70 bg-slate-900/40"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Atom
              className={`h-4 w-4 ${
                active.quantumGrover.isPostQuantumSafe
                  ? "text-cyan-300"
                  : "text-amber-400"
              }`}
            />
            <span>Margen Frente al Algoritmo de Grover (Cuántico)</span>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-300">
            {active.quantumGrover.effectiveBits.toFixed(1)} bits efectivos (H / 2)
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
          {active.quantumGrover.summary}
        </p>
      </div>

      {/* Practical recommendations */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Recomendaciones prácticas
        </div>
        <ul className="space-y-1.5 text-xs text-slate-300">
          {active.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--accent)" }}
              />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
