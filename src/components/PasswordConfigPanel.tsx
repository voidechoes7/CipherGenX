import type { PasswordConfig } from "../types/ciphergen";

interface PasswordConfigPanelProps {
  config: PasswordConfig;
  onChange: (next: PasswordConfig) => void;
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

export function PasswordConfigPanel({
  config,
  onChange,
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
      return; // Always keep at least one character set active
    }
    onChange({ ...config, [key]: !config[key] });
  };

  return (
    <div className="space-y-5">
      {/* Length slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="pw-length"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Longitud de contraseña
          </label>
          <div className="flex items-center gap-2">
            {[16, 24, 32, 48, 64].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ ...config, length: preset })}
                className={`rounded-md px-2 py-0.5 text-[11px] font-mono transition ${
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
              style={
                checked
                  ? { borderColor: "var(--border-accent)" }
                  : undefined
              }
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

      <p className="text-[11px] text-slate-400">
        Política garantizada: al menos 1 carácter de cada conjunto activo + mezcla
        Fisher-Yates con muestreo por rechazo CSPRNG.
      </p>
    </div>
  );
}
