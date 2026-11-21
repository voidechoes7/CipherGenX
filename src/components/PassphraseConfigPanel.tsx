import type { Capitalization, PassphraseConfig } from "../types/ciphergen";

interface PassphraseConfigPanelProps {
  config: PassphraseConfig;
  onChange: (next: PassphraseConfig) => void;
}

const SEPARATORS = [
  { label: "Guion (-)", value: "-" },
  { label: "Guion bajo (_)", value: "_" },
  { label: "Punto (.)", value: "." },
  { label: "Espacio ( )", value: " " },
  { label: "Barra (/)", value: "/" },
];

const CAP_OPTIONS: { value: Capitalization; label: string }[] = [
  { value: "title", label: "Título (Abc)" },
  { value: "none", label: "minúsculas" },
  { value: "upper", label: "MAYÚSCULAS" },
  { value: "randomWord", label: "1 Palabra Aleatoria" },
];

export function PassphraseConfigPanel({
  config,
  onChange,
}: PassphraseConfigPanelProps) {
  return (
    <div className="space-y-5">
      {/* Word count slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="pp-words"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Número de palabras (EFF 7,776)
          </label>
          <span
            className="min-w-[3.5rem] rounded-lg px-2.5 py-1 text-center font-mono text-sm font-bold"
            style={{
              background: "var(--accent-glow)",
              color: "var(--accent)",
              border: "1px solid var(--border-accent)",
            }}
          >
            {config.wordCount} pal.
          </span>
        </div>
        <input
          id="pp-words"
          type="range"
          min={4}
          max={12}
          value={config.wordCount}
          onChange={(e) =>
            onChange({ ...config, wordCount: Number(e.target.value) })
          }
          className="cyber-slider w-full"
        />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>4 (~51.7 bits)</span>
          <span>6 (~77.5 bits)</span>
          <span>10 (~129.2 bits)</span>
          <span>12 (~155.1 bits)</span>
        </div>
      </div>

      {/* Separator */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Separador
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SEPARATORS.map((sep) => {
            const active = config.separator === sep.value;
            return (
              <button
                key={sep.label}
                type="button"
                onClick={() => onChange({ ...config, separator: sep.value })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "text-white"
                    : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
                style={
                  active
                    ? {
                        background: "var(--accent-glow)",
                        borderColor: "var(--border-accent)",
                      }
                    : undefined
                }
              >
                {sep.label}
              </button>
            );
          })}
          <input
            type="text"
            maxLength={4}
            value={config.separator}
            onChange={(e) => onChange({ ...config, separator: e.target.value })}
            placeholder="Custom"
            aria-label="Separador personalizado"
            className="cyber-elevated w-20 rounded-lg px-2.5 py-1.5 text-center font-mono text-xs text-slate-100 outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Capitalization & Number */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Capitalización
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {CAP_OPTIONS.map((opt) => {
              const active = config.capitalization === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onChange({ ...config, capitalization: opt.value })
                  }
                  className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                    active
                      ? "text-white"
                      : "border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                  style={
                    active
                      ? {
                          background: "var(--accent-glow)",
                          borderColor: "var(--border-accent)",
                        }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Entropía adicional
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({ ...config, includeNumber: !config.includeNumber })
            }
            className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
              config.includeNumber
                ? "bg-white/[0.04] text-slate-100"
                : "border-slate-800 text-slate-500"
            }`}
            style={
              config.includeNumber
                ? { borderColor: "var(--border-accent)" }
                : undefined
            }
          >
            <div>
              <div className="text-xs font-semibold sm:text-sm">
                Incluir dígito aleatorio
              </div>
              <div className="text-[11px] text-slate-400">
                Añade 0–9 en posición aleatoria (+log₂(N×10) bits)
              </div>
            </div>
            <div
              className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                config.includeNumber ? "justify-end" : "justify-start bg-slate-800"
              }`}
              style={
                config.includeNumber
                  ? { backgroundColor: "var(--accent)" }
                  : undefined
              }
            >
              <span className="h-4 w-4 rounded-full bg-slate-950 shadow" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
