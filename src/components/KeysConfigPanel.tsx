import type { KeyConfig, KeySubMode, PinConfig } from "../types/ciphergen";

interface KeysConfigPanelProps {
  subMode: KeySubMode;
  onSubModeChange: (mode: KeySubMode) => void;
  pinConfig: PinConfig;
  onPinChange: (next: PinConfig) => void;
  keyConfig: KeyConfig;
  onKeyChange: (next: KeyConfig) => void;
}

export function KeysConfigPanel({
  subMode,
  onSubModeChange,
  pinConfig,
  onPinChange,
  keyConfig,
  onKeyChange,
}: KeysConfigPanelProps) {
  return (
    <div className="space-y-5">
      {/* Sub-mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: "pin", label: "PIN Numérico", desc: "4–16 dígitos CSPRNG" },
            { id: "hex", label: "Llave Hex", desc: "128 / 256 bits" },
            { id: "base32", label: "Llave Base32", desc: "RFC 4648 (TOTP)" },
          ] as const
        ).map((item) => {
          const active = subMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSubModeChange(item.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
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
              <div className="text-xs font-semibold sm:text-sm">{item.label}</div>
              <div className="text-[11px] text-slate-400">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {subMode === "pin" ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="pin-len"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Longitud del PIN
            </label>
            <div className="flex items-center gap-1.5">
              {[4, 6, 8, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onPinChange({ ...pinConfig, length: n })}
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                    pinConfig.length === n
                      ? "bg-white/15 font-bold text-white"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {n}
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
                {pinConfig.length}
              </span>
            </div>
          </div>
          <input
            id="pin-len"
            type="range"
            min={4}
            max={16}
            value={pinConfig.length}
            onChange={(e) =>
              onPinChange({ ...pinConfig, length: Number(e.target.value) })
            }
            className="cyber-slider w-full"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tamaño de llave criptográfica
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["128", "256"] as const).map((bits) => {
                const active = keyConfig.bits === bits;
                return (
                  <button
                    key={bits}
                    type="button"
                    onClick={() => onKeyChange({ ...keyConfig, bits })}
                    className={`rounded-xl border px-3 py-2.5 text-center transition ${
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
                    <div className="font-mono text-sm font-bold">{bits}-bit</div>
                    <div className="text-[11px] text-slate-400">
                      {bits === "256" ? "Post-Cuántica" : "Ultra Segura"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Formato de salida
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onKeyChange({ ...keyConfig, uppercase: !keyConfig.uppercase })
                }
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                  keyConfig.uppercase
                    ? "text-white"
                    : "border-slate-800 text-slate-400"
                }`}
                style={
                  keyConfig.uppercase
                    ? {
                        background: "var(--accent-glow)",
                        borderColor: "var(--border-accent)",
                      }
                    : undefined
                }
              >
                MAYÚSCULAS
              </button>
              <button
                type="button"
                onClick={() =>
                  onKeyChange({ ...keyConfig, grouped: !keyConfig.grouped })
                }
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                  keyConfig.grouped
                    ? "text-white"
                    : "border-slate-800 text-slate-400"
                }`}
                style={
                  keyConfig.grouped
                    ? {
                        background: "var(--accent-glow)",
                        borderColor: "var(--border-accent)",
                      }
                    : undefined
                }
              >
                Agrupar (4-4)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
