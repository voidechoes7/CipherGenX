import { useState } from "react";
import { Eye, EyeOff, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { SecurityAnalysis } from "../types/ciphergen";
import { SecurityAnalysisPanel } from "./SecurityAnalysisPanel";

interface ManualAnalyzerPanelProps {
  secret: string;
  onSecretChange: (val: string) => void;
  analysis: SecurityAnalysis | null;
}

export function ManualAnalyzerPanel({
  secret,
  onSecretChange,
  analysis,
}: ManualAnalyzerPanelProps) {
  const [visible, setVisible] = useState(true);

  const chars = [...secret];
  const uniqueCount = new Set(chars).size;
  const hasUpper = /[A-Z]/.test(secret);
  const hasLower = /[a-z]/.test(secret);
  const hasDigit = /[0-9]/.test(secret);
  const hasSymbol = /[^a-zA-Z0-9\s]/.test(secret);

  return (
    <div className="space-y-5">
      <section className="cyber-panel cyber-accent-ring rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-100 sm:text-base">
              Analizador Manual de Contraseñas (100% Local)
            </h2>
            <p className="text-xs text-slate-400">
              Escribe o pega cualquier contraseña para evaluar su entropía real,
              resistencia GPU/Argon2id y margen cuántico Grover.
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <input
            type={visible ? "text" : "password"}
            value={secret}
            onChange={(e) => onSecretChange(e.target.value)}
            placeholder="Escribe una contraseña aquí para analizarla en tiempo real..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="cyber-elevated font-mono-secret w-full rounded-xl px-4 py-3.5 pr-24 text-sm text-slate-100 outline-none focus:border-cyan-400 sm:text-base"
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              title={visible ? "Ocultar" : "Mostrar"}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {secret.length > 0 && (
              <button
                type="button"
                onClick={() => onSecretChange("")}
                title="Limpiar campo"
                className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/15"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Character composition pills */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <div className="cyber-elevated rounded-xl px-3 py-2 text-center">
            <div className="font-mono text-sm font-bold text-slate-100">
              {chars.length}
            </div>
            <div className="text-[10px] text-slate-400">Longitud</div>
          </div>
          <div className="cyber-elevated rounded-xl px-3 py-2 text-center">
            <div className="font-mono text-sm font-bold text-slate-100">
              {uniqueCount}
            </div>
            <div className="text-[10px] text-slate-400">Únicos</div>
          </div>
          {[
            { label: "Mayúsculas", ok: hasUpper },
            { label: "Minúsculas", ok: hasLower },
            { label: "Números", ok: hasDigit },
            { label: "Símbolos", ok: hasSymbol },
          ].map((item) => (
            <div
              key={item.label}
              className="cyber-elevated flex flex-col items-center justify-center rounded-xl px-2 py-2 text-center"
            >
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-slate-500" />
              )}
              <div className="mt-0.5 text-[10px] text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          Privacidad garantizada: el texto nunca sale de la memoria RAM de tu
          dispositivo ni se envía a ningún servidor.
        </p>
      </section>

      {analysis ? (
        <SecurityAnalysisPanel
          analysis={analysis}
          customSecret={secret}
          onCustomSecretChange={onSecretChange}
          customAnalysis={analysis}
          hideInlineInspector
        />
      ) : (
        <div className="cyber-panel rounded-2xl p-6 text-center text-xs text-slate-400">
          Empieza a escribir una contraseña arriba para ver su entropía exacta,
          tiempo estimado de descifrado y margen frente al algoritmo de Grover.
        </div>
      )}
    </div>
  );
}
