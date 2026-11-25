import type {
  Bip39Config,
  Bip39WordCount,
  KeyBits,
  KeyConfig,
  KeySubMode,
  PinConfig,
  RecoveryCodeConfig,
  RecoveryCodeFormat,
  UuidConfig,
} from "../types/ciphergen";

interface KeysConfigPanelProps {
  subMode: KeySubMode;
  onSubModeChange: (mode: KeySubMode) => void;
  pinConfig: PinConfig;
  onPinChange: (next: PinConfig) => void;
  keyConfig: KeyConfig;
  onKeyChange: (next: KeyConfig) => void;
  uuidConfig: UuidConfig;
  onUuidChange: (next: UuidConfig) => void;
  bip39Config: Bip39Config;
  onBip39Change: (next: Bip39Config) => void;
  recoveryConfig: RecoveryCodeConfig;
  onRecoveryChange: (next: RecoveryCodeConfig) => void;
  onBatchCountChange?: (count: number) => void;
}

const SUB_MODES: { id: KeySubMode; label: string; desc: string }[] = [
  { id: "bip39", label: "Semilla BIP-39", desc: "12–24 pal. SHA-256" },
  { id: "base64Url", label: "Base64URL", desc: "JWT / OAuth / API" },
  { id: "uuid", label: "UUID v4", desc: "RFC 9562 • 122 bits" },
  { id: "recovery", label: "Códigos 2FA", desc: "Respaldo MFA" },
  { id: "hex", label: "Llave Hex", desc: "128–512 bits" },
  { id: "base32", label: "Base32 TOTP", desc: "RFC 4648" },
  { id: "pin", label: "PIN Numérico", desc: "4–16 dígitos" },
];

const BIP39_COUNTS: { value: Bip39WordCount; bits: number }[] = [
  { value: "12", bits: 128 },
  { value: "15", bits: 160 },
  { value: "18", bits: 192 },
  { value: "21", bits: 224 },
  { value: "24", bits: 256 },
];

const RECOVERY_FORMATS: {
  id: RecoveryCodeFormat;
  label: string;
  sample: string;
  bits: string;
}[] = [
  { id: "blocks4x2", label: "4×2", sample: "A7K9-M2P4", bits: "39.6" },
  { id: "blocks5x2", label: "5×2 (Estándar)", sample: "A7K9M-2P4X8", bits: "49.5" },
  { id: "blocks4x4", label: "4×4 (Alta seg.)", sample: "A7K9-M2P4-X8Q3-W5N6", bits: "79.3" },
];

export function KeysConfigPanel({
  subMode,
  onSubModeChange,
  pinConfig,
  onPinChange,
  keyConfig,
  onKeyChange,
  uuidConfig,
  onUuidChange,
  bip39Config,
  onBip39Change,
  recoveryConfig,
  onRecoveryChange,
  onBatchCountChange,
}: KeysConfigPanelProps) {
  const bitOptions: KeyBits[] =
    subMode === "base32" ? ["128", "256"] : ["128", "192", "256", "512"];

  return (
    <div className="space-y-5">
      {/* Sub-mode selector */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SUB_MODES.map((item) => {
          const active = subMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSubModeChange(item.id)}
              className={`rounded-xl border px-3 py-2 text-left transition ${
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
              <div className="text-xs font-semibold">{item.label}</div>
              <div className="text-[10px] text-slate-400">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {/* PIN */}
      {subMode === "pin" && (
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
      )}

      {/* Hex / Base32 / Base64URL */}
      {(subMode === "hex" || subMode === "base32" || subMode === "base64Url") && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Entropía binaria exacta
            </div>
            <div
              className={`grid gap-2 ${
                bitOptions.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
              }`}
            >
              {bitOptions.map((bits) => {
                const active = keyConfig.bits === bits;
                return (
                  <button
                    key={bits}
                    type="button"
                    onClick={() => onKeyChange({ ...keyConfig, bits })}
                    className={`rounded-xl border px-3 py-2 text-center transition ${
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
                    <div className="text-[10px] text-slate-400">
                      {Number(bits) >= 256 ? "Post-Cuántica" : "Ultra Segura"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {subMode !== "base64Url" ? (
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
          ) : (
            <p className="text-[11px] text-slate-400">
              RFC 4648 §5 URL-safe (sin relleno <code className="font-mono">=</code>): listo
              para tokens JWT, OAuth PKCE, Bearer API y secretos de webhooks.
            </p>
          )}
        </div>
      )}

      {/* UUID v4 */}
      {subMode === "uuid" && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Formato UUID v4 (RFC 9562 • 122 bits CSPRNG)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onUuidChange({ ...uuidConfig, hyphens: !uuidConfig.hyphens })
              }
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                uuidConfig.hyphens
                  ? "text-white"
                  : "border-slate-800 text-slate-400"
              }`}
              style={
                uuidConfig.hyphens
                  ? {
                      background: "var(--accent-glow)",
                      borderColor: "var(--border-accent)",
                    }
                  : undefined
              }
            >
              Con guiones (8-4-4-4-12)
            </button>
            <button
              type="button"
              onClick={() =>
                onUuidChange({ ...uuidConfig, uppercase: !uuidConfig.uppercase })
              }
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                uuidConfig.uppercase
                  ? "text-white"
                  : "border-slate-800 text-slate-400"
              }`}
              style={
                uuidConfig.uppercase
                  ? {
                      background: "var(--accent-glow)",
                      borderColor: "var(--border-accent)",
                    }
                  : undefined
              }
            >
              MAYÚSCULAS
            </button>
          </div>
        </div>
      )}

      {/* BIP-39 */}
      {subMode === "bip39" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Longitud de frase semilla BIP-39
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {BIP39_COUNTS.map((opt) => {
                const active = bip39Config.wordCount === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onBip39Change({ ...bip39Config, wordCount: opt.value })
                    }
                    className={`rounded-xl border px-2 py-2 text-center transition ${
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
                    <div className="font-mono text-sm font-bold">{opt.value}</div>
                    <div className="text-[10px] text-slate-400">{opt.bits}b</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Idioma oficial BIP-39 (2,048 palabras)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "en", label: "English (Estándar Wallets)" },
                  { id: "es", label: "Español (BIP-39 ES)" },
                ] as const
              ).map((lang) => {
                const active = bip39Config.language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() =>
                      onBip39Change({ ...bip39Config, language: lang.id })
                    }
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
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
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Incluye suma de verificación SHA-256 exacta según especificación BIP-39
            (compatible con billeteras hardware y software).
          </p>
        </div>
      )}

      {/* 2FA Recovery Codes */}
      {subMode === "recovery" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Formato de códigos de recuperación
            </span>
            {onBatchCountChange && (
              <button
                type="button"
                onClick={() => onBatchCountChange(8)}
                className="cyber-elevated rounded-lg px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition hover:border-cyan-400/50"
              >
                Generar kit de 8 códigos
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {RECOVERY_FORMATS.map((fmt) => {
              const active = recoveryConfig.format === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() =>
                    onRecoveryChange({ ...recoveryConfig, format: fmt.id })
                  }
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
                  <div className="text-xs font-bold">{fmt.label}</div>
                  <div className="font-mono-secret truncate text-[10px] text-slate-400">
                    {fmt.sample}
                  </div>
                  <div className="mt-0.5 text-[10px] text-cyan-300">
                    {fmt.bits} bits exactos
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            Alfabeto de 31 caracteres sin ambiguos (excluye 0, O, 1, I, L) • ~4.95 bits por carácter.
          </p>
        </div>
      )}
    </div>
  );
}
