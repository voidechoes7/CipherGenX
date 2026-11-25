import { useEffect, useState } from "react";
import {
  Vault,
  Eye,
  EyeOff,
  Copy,
  Check,
  QrCode,
  Radio,
  Minus,
  Plus,
  Loader2,
  ShieldCheck,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import type {
  MasterFingerprint,
  VaultConfig,
  VaultResult,
} from "../types/ciphergen";
import { computeMasterFingerprint, deriveVaultPassword } from "../lib/tauriBridge";
import { SecurityAnalysisPanel } from "./SecurityAnalysisPanel";
import { NatoSpellingView } from "./NatoSpellingView";

interface VaultPanelProps {
  config: VaultConfig;
  onChange: (next: VaultConfig) => void;
  result: VaultResult | null;
  onResult: (res: VaultResult | null) => void;
  onCopy: (value: string) => void;
  onShowQr: (value: string, label: string, entropyBits: number) => void;
  onRecordHistory: (res: VaultResult, site: string, counter: number) => void;
}

const FINGERPRINT_GLYPHS = [
  "◆", "▲", "●", "★", "⬟", "❖", "⬢", "✦",
  "⬣", "◈", "⯁", "⬡", "❂", "✧", "⛨", "⚡",
];

const QUICK_SITES = [
  "github.com",
  "google.com",
  "proton.me",
  "amazon.com",
  "banco",
  "ssh-server",
];

export function VaultPanel({
  config,
  onChange,
  result,
  onResult,
  onCopy,
  onShowQr,
  onRecordHistory,
}: VaultPanelProps) {
  const [showMaster, setShowMaster] = useState(false);
  const [showDerived, setShowDerived] = useState(true);
  const [showNato, setShowNato] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fingerprint, setFingerprint] = useState<MasterFingerprint | null>(null);

  useEffect(() => {
    if (!config.masterPassword) {
      setFingerprint(null);
      return;
    }
    let cancelled = false;
    void computeMasterFingerprint(config.masterPassword).then((fp) => {
      if (!cancelled) setFingerprint(fp);
    });
    return () => {
      cancelled = true;
    };
  }, [config.masterPassword]);

  const activeSetCount =
    Number(config.uppercase) +
    Number(config.lowercase) +
    Number(config.numbers) +
    Number(config.safeSymbols) +
    Number(config.extendedSymbols);

  const toggleRule = (
    key:
      | "uppercase"
      | "lowercase"
      | "numbers"
      | "safeSymbols"
      | "extendedSymbols"
      | "excludeAmbiguous"
  ) => {
    const isCharSet = key !== "excludeAmbiguous";
    if (isCharSet && config[key] && activeSetCount <= 1) return;
    onChange({ ...config, [key]: !config[key] });
  };

  const handleDerive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setDeriving(true);
    setShowNato(false);
    try {
      const res = await deriveVaultPassword(config);
      onResult(res);
      onRecordHistory(res, config.site.trim().toLowerCase(), config.counter);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      onResult(null);
    } finally {
      setDeriving(false);
    }
  };

  const handleCopyResult = () => {
    if (!result) return;
    onCopy(result.item.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleDerive}
        className="cyber-panel cyber-accent-ring space-y-5 rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Vault className="h-5 w-5 shrink-0" style={{ color: "var(--accent)" }} />
            <div>
              <h2 className="text-sm font-bold tracking-tight sm:text-base">
                Bóveda Determinista Argon2id (Stateless)
              </h2>
              <p className="text-xs text-slate-400">
                Regenera la misma contraseña única en cualquier dispositivo sin guardar
                ninguna base de datos ni archivo en disco.
              </p>
            </div>
          </div>

          <span className="cyber-elevated rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-300">
            Argon2id • 64 MiB • t=3
          </span>
        </div>

        {/* Master password + live anti-typo fingerprint */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="vault-master"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Contraseña Maestra (solo en RAM)
            </label>
            {fingerprint && (
              <div
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  borderColor: `hsla(${fingerprint.hueDeg}, 85%, 60%, 0.55)`,
                  backgroundColor: `hsla(${fingerprint.hueDeg}, 85%, 50%, 0.14)`,
                  color: `hsl(${fingerprint.hueDeg}, 90%, 72%)`,
                }}
                title="Huella visual anti-errores: verifica que los 3 símbolos y el código coincidan con tu maestra habitual"
              >
                <span className="tracking-widest">
                  {fingerprint.symbolIndices
                    .map((i) => FINGERPRINT_GLYPHS[i % FINGERPRINT_GLYPHS.length])
                    .join(" ")}
                </span>
                <span className="font-mono text-[10px] opacity-90">
                  #{fingerprint.code}
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <input
              id="vault-master"
              type={showMaster ? "text" : "password"}
              value={config.masterPassword}
              onChange={(e) =>
                onChange({ ...config, masterPassword: e.target.value })
              }
              placeholder="Tu frase maestra Diceware o contraseña principal..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="cyber-elevated font-mono-secret w-full rounded-xl px-4 py-3 pr-11 text-sm text-slate-100 outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => setShowMaster((v) => !v)}
              aria-label={showMaster ? "Ocultar maestra" : "Mostrar maestra"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              {showMaster ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Site, Login, Counter */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="space-y-1.5 sm:col-span-5">
            <label
              htmlFor="vault-site"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Sitio / Servicio
            </label>
            <input
              id="vault-site"
              type="text"
              value={config.site}
              onChange={(e) => onChange({ ...config, site: e.target.value })}
              placeholder="ej. github.com"
              autoComplete="off"
              className="cyber-elevated w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
            />
            <div className="flex flex-wrap gap-1 pt-0.5">
              {QUICK_SITES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ ...config, site: s })}
                  className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-4">
            <label
              htmlFor="vault-login"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Usuario / Email (opcional)
            </label>
            <input
              id="vault-login"
              type="text"
              value={config.login}
              onChange={(e) => onChange({ ...config, login: e.target.value })}
              placeholder="ej. usuario@dominio.com"
              autoComplete="off"
              className="cyber-elevated w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-3">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Versión (rotación)
            </span>
            <div className="cyber-elevated flex items-center justify-between rounded-xl px-2 py-1.5">
              <button
                type="button"
                onClick={() =>
                  onChange({ ...config, counter: Math.max(1, config.counter - 1) })
                }
                aria-label="Reducir versión"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-sm font-bold text-cyan-300">
                v{config.counter}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...config,
                    counter: Math.min(999_999, config.counter + 1),
                  })
                }
                aria-label="Incrementar versión"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Policy controls */}
        <div className="grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-4 sm:grid-cols-12">
          <div className="space-y-2 sm:col-span-5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="vault-len"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Longitud
              </label>
              <span className="font-mono text-xs font-bold text-cyan-300">
                {config.length} chars
              </span>
            </div>
            <input
              id="vault-len"
              type="range"
              min={8}
              max={64}
              value={config.length}
              onChange={(e) =>
                onChange({ ...config, length: Number(e.target.value) })
              }
              className="cyber-slider w-full"
            />
            <input
              type="text"
              value={config.customExclude}
              onChange={(e) =>
                onChange({ ...config, customExclude: e.target.value })
              }
              placeholder="Excluir caracteres (ej. &quot;'/\)"
              aria-label="Excluir caracteres en bóveda"
              className="cyber-elevated font-mono-secret w-full rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:col-span-7 sm:grid-cols-3">
            {(
              [
                { key: "uppercase", label: "A–Z" },
                { key: "lowercase", label: "a–z" },
                { key: "numbers", label: "0–9" },
                { key: "safeSymbols", label: "Símbolos" },
                { key: "extendedSymbols", label: "Extendidos" },
                { key: "excludeAmbiguous", label: "Sin ambiguos" },
              ] as const
            ).map((r) => {
              const active = config[r.key];
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggleRule(r.key)}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition ${
                    active
                      ? "text-white"
                      : "border-slate-800 text-slate-500 hover:border-slate-700"
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
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onChange({ ...config, masterPassword: "", site: "", login: "", counter: 1 });
              onResult(null);
              setError(null);
            }}
            className="cyber-elevated inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-300 transition hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpiar campos</span>
          </button>

          <button
            type="submit"
            disabled={deriving}
            className="btn-accent-text inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 sm:text-sm"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {deriving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Derivando con Argon2id (64 MiB)...</span>
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                <span>Derivar Contraseña</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Derived result card */}
      {result && (
        <div className="space-y-5">
          <section className="cyber-panel cyber-accent-ring rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Clave Derivada • {config.site.trim().toLowerCase()} (v{config.counter})
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                {result.kdfSpec}
              </span>
            </div>

            <div className="cyber-elevated flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3.5">
              <code className="font-mono-secret break-all text-base font-bold text-slate-100 sm:text-lg">
                {showDerived
                  ? result.item.value
                  : "•".repeat(Math.min(result.item.value.length, 32))}
              </code>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowDerived((v) => !v)}
                  title={showDerived ? "Ocultar" : "Mostrar"}
                  className="rounded-lg border border-slate-700/70 p-2 text-slate-300 transition hover:text-white"
                >
                  {showDerived ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onShowQr(
                      result.item.value,
                      `Bóveda • ${config.site.trim()}`,
                      result.item.entropyBits
                    )
                  }
                  title="Mostrar código QR offline"
                  className="rounded-lg border border-slate-700/70 p-2 text-slate-300 transition hover:text-white"
                >
                  <QrCode className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowNato((v) => !v)}
                  title="Deletreo fonético NATO"
                  className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                    showNato
                      ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200"
                      : "border-slate-700/70 text-slate-300 hover:text-white"
                  }`}
                >
                  <Radio className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="btn-accent-text inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition hover:brightness-110"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {showNato && (
              <NatoSpellingView
                value={result.item.value}
                onCopyNato={onCopy}
              />
            )}
          </section>

          <SecurityAnalysisPanel
            analysis={result.analysis}
            customSecret=""
            onCustomSecretChange={() => {}}
            customAnalysis={null}
            hideInlineInspector
          />
        </div>
      )}
    </div>
  );
}
