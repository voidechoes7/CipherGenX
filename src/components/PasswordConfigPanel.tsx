import { Ban, X } from "lucide-react";
import type { PasswordConfig } from "../types/ciphergen";

interface PasswordConfigPanelProps {
  config: PasswordConfig;
  onChange: (next: PasswordConfig) => void;
  effectiveAlphabetSize?: number;
}

interface ToggleItem {
  key: keyof Pick<
    PasswordConfig,
    | "uppercase"
    | "lowercase"
    | "numbers"
    | "safeSymbols"
    | "extendedSymbols"
    | "excludeAmbiguous"
  >;
  label: string;
  sample: string;
}

const TOGGLES: ToggleItem[] = [
  { key: "uppercase", label: "Mayúsculas", sample: "A–Z" },
  { key: "lowercase", label: "Minúsculas", sample: "a–z" },
  { key: "numbers", label: "Números", sample: "0–9" },
  { key: "safeSymbols", label: "Símbolos seguros", sample: "!@#$%^&*-_=+?" },
  { key: "extendedSymbols", label: "Símbolos extendidos", sample: "~()[]{}<>:;.,/|" },
  { key: "excludeAmbiguous", label: "Excluir ambiguos", sample: "0 O 1 l I |" },
];

const QUICK_EXCLUDES = [
  { label: `Comillas "'`, chars: `"'` + "`" },
  { label: "Barras /\\", chars: "/\\" },
  { label: "HTML <>&", chars: "<>&" },
  { label: "Shell $;|", chars: "$;|`" },
];

export function PasswordConfigPanel({
  config,
  onChange,
  effectiveAlphabetSize,
}: PasswordConfigPanelProps) {
  const activeSetCount =
    Number(config.uppercase) +
    Number(config.lowercase) +
    Number(config.numbers) +
    Number(config.safeSymbols) +
    Number(config.extendedSymbols);

  const toggle = (key: ToggleItem["key"]) => {
    const isCharSet = key !== "excludeAmbiguous";
    if (isCharSet && config[key] && activeSetCount <= 1) {
      return;
    }
    onChange({ ...config, [key]: !config[key] });
  };

  const addExcludedChars = (chars: string) => {
    const current = new Set([...config.customExclude]);
    for (const c of chars) current.add(c);
    onChange({ ...config, customExclude: [...current].join("") });
  };

  const uniqueExcludedCount = new Set([...config.customExclude]).size;

  return (
    <div className="space-y-5">
      {/* Length slider */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="pw-length"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Longitud de contraseña
          </label>
          <div className="flex items-center gap-1.5">
            {[16, 24, 32, 48, 64].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ ...config, length: preset })}
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] transition ${
                  config.length === preset
                    ? "bg-white/15 font-bold text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {preset}
              </button>
            ))}
            <span
              className="ml-1 min-w-[3rem] rounded-lg px-2.5 py-1 text-center font-mono text-sm font-bold"
              style={{
                background: "var(--accent-glow)",
                color: "var(--accent)",
                border: "1px solid var(--border-accent)",
              }}
            >
              {config.length}
            </span>
          </div>
        </div>
        <input
          id="pw-length"
          type="range"
          min={8}
          max={128}
          value={config.length}
          onChange={(e) => onChange({ ...config, length: Number(e.target.value) })}
          className="cyber-slider w-full"
        />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>8 mín.</span>
          <span>44+ chars ≈ Post-Cuántica (256 bits)</span>
          <span>128 máx.</span>
        </div>
      </div>

      {/* Character set toggles */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {TOGGLES.map((item) => {
          const checked = config[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggle(item.key)}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                checked
                  ? "bg-white/[0.04] text-slate-100"
                  : "border-slate-800/80 bg-transparent text-slate-500 hover:border-slate-700"
              }`}
              style={checked ? { borderColor: "var(--border-accent)" } : undefined}
            >
              <div>
                <div className="text-xs font-semibold sm:text-sm">{item.label}</div>
                <div className="font-mono-secret text-[11px] text-slate-400">
                  {item.sample}
                </div>
              </div>
              <div
                className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                  checked ? "justify-end" : "justify-start bg-slate-800"
                }`}
                style={checked ? { backgroundColor: "var(--accent)" } : undefined}
              >
                <span className="h-4 w-4 rounded-full bg-slate-950 shadow" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom character exclusion */}
      <div className="space-y-2 rounded-xl border border-slate-800/80 bg-white/[0.02] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="pw-custom-exclude"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            <Ban className="h-3.5 w-3.5 text-amber-400" />
            <span>Exclusión personalizada</span>
          </label>
          <span className="font-mono text-[10px] text-slate-400">
            {uniqueExcludedCount > 0 ? `${uniqueExcludedCount} excluidos` : "Sin exclusiones"}
            {typeof effectiveAlphabetSize === "number" && (
              <> • Alfabeto: {effectiveAlphabetSize}</>
            )}
          </span>
        </div>

        <div className="relative">
          <input
            id="pw-custom-exclude"
            type="text"
            value={config.customExclude}
            onChange={(e) =>
              onChange({ ...config, customExclude: e.target.value })
            }
            placeholder="Escribe caracteres prohibidos por el sitio (ej. &quot;'\/<>;$)"
            autoComplete="off"
            spellCheck={false}
            className="cyber-elevated font-mono-secret w-full rounded-lg px-3 py-2 pr-8 text-xs text-slate-100 outline-none focus:border-cyan-400"
          />
          {config.customExclude.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...config, customExclude: "" })}
              aria-label="Limpiar exclusiones personalizadas"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500">Filtros rápidos:</span>
          {QUICK_EXCLUDES.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => addExcludedChars(chip.chars)}
              className="cyber-elevated rounded-md px-2 py-0.5 font-mono text-[10px] text-slate-300 transition hover:border-amber-400/50 hover:text-white"
            >
              + {chip.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Política garantizada: al menos 1 carácter de cada conjunto activo + mezcla
        Fisher-Yates con muestreo por rechazo CSPRNG.
      </p>
    </div>
  );
}
