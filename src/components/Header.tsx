import {
  WifiOff,
  Cpu,
  Palette,
  ShieldOff,
  Fingerprint,
  Lock,
  Sun,
  History,
  ShieldAlert,
} from "lucide-react";
import { THEMES } from "../lib/themes";
import { AUTO_LOCK_OPTIONS } from "../lib/autolock";
import type { AutoLockMode, ThemeId } from "../types/ciphergen";

interface HeaderProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  isNativeRust: boolean;
  onPanicWipe: () => void;
  biometricAvailable: boolean;
  biometricLabel: string;
  biometricLockEnabled: boolean;
  onToggleBiometricLock: (enabled: boolean) => void;
  onLockNow: () => void;
  autoLockMode: AutoLockMode;
  onAutoLockModeChange: (mode: AutoLockMode) => void;
  historyCount: number;
  historyOpen: boolean;
  onToggleHistory: () => void;
}

export function Header({
  theme,
  onThemeChange,
  isNativeRust,
  onPanicWipe,
  biometricAvailable,
  biometricLabel,
  biometricLockEnabled,
  onToggleBiometricLock,
  onLockNow,
  autoLockMode,
  onAutoLockModeChange,
  historyCount,
  historyOpen,
  onToggleHistory,
}: HeaderProps) {
  return (
    <header className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border"
          style={{
            borderColor: "var(--border-accent)",
            boxShadow: "0 0 18px var(--accent-glow)",
          }}
        >
          <img
            src="/logo.png"
            alt="CipherGenX Quantum Vault Core"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Cipher<span style={{ color: "var(--accent)" }}>GenX</span>
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{
                background: "var(--accent-glow)",
                color: "var(--accent)",
                border: "1px solid var(--border-accent)",
              }}
            >
              v1.1.1
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Generador criptográfico CSPRNG + Bóveda Argon2id • 100% Offline
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="cyber-elevated flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
          <WifiOff className="h-3.5 w-3.5 text-emerald-400" />
          <span>Offline</span>
          <span className="mx-0.5 text-slate-500">•</span>
          <Cpu className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span>{isNativeRust ? "Rust" : "WebCrypto"}</span>
        </div>

        {/* RAM ephemeral history toggle */}
        <button
          type="button"
          onClick={onToggleHistory}
          title="Historial efímero en RAM (se destruye al cerrar o bloquear)"
          className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
          style={
            historyOpen
              ? {
                  borderColor: "var(--border-accent)",
                  background: "var(--accent-glow)",
                  color: "var(--accent)",
                }
              : undefined
          }
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">RAM</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.2 font-mono text-[10px] font-bold">
            {historyCount}
          </span>
        </button>

        {/* Auto-lock on minimize selector */}
        <div
          className="cyber-elevated flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-300"
          title="Auto-bloqueo y limpieza de RAM al minimizar o cambiar de app"
        >
          <ShieldAlert
            className={`h-3.5 w-3.5 ${
              autoLockMode === "off" ? "text-slate-500" : "text-emerald-400"
            }`}
          />
          <select
            aria-label="Auto-bloqueo al minimizar"
            value={autoLockMode}
            onChange={(e) => onAutoLockModeChange(e.target.value as AutoLockMode)}
            className="bg-transparent font-mono text-[11px] font-semibold text-slate-200 outline-none"
          >
            {AUTO_LOCK_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-slate-900 text-slate-100"
              >
                Auto-lock: {opt.short}
              </option>
            ))}
          </select>
        </div>

        {biometricAvailable && (
          <button
            type="button"
            onClick={() => onToggleBiometricLock(!biometricLockEnabled)}
            title={`${biometricLockEnabled ? "Desactivar" : "Activar"} bloqueo con ${biometricLabel}`}
            className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition"
            style={
              biometricLockEnabled
                ? {
                    borderColor: "var(--border-accent)",
                    background: "var(--accent-glow)",
                    color: "var(--accent)",
                  }
                : undefined
            }
          >
            <Fingerprint className="h-3.5 w-3.5" />
            <span className="hidden md:inline">
              {biometricLockEnabled ? `${biometricLabel}: ON` : biometricLabel}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onLockNow}
          title="Bloquear y limpiar RAM ahora"
          className="cyber-elevated inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
        >
          <Lock className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onPanicWipe}
          title="Limpiar secretos en pantalla, historial RAM y portapapeles (Esc)"
          className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:border-rose-500/50"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Limpiar RAM</span>
        </button>

        <div
          className="cyber-elevated flex items-center gap-1.5 rounded-lg px-2 py-1"
          role="group"
          aria-label="Selector de tema"
        >
          <Palette className="ml-0.5 h-3.5 w-3.5 text-slate-400" />
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                title={t.name}
                onClick={() => onThemeChange(t.id)}
                className={`relative flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br ${t.swatch} transition-transform ${
                  active
                    ? "scale-110 ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900"
                    : "opacity-70 hover:opacity-100"
                }`}
                aria-label={`Tema ${t.name}`}
              >
                {t.isLight && <Sun className="h-3 w-3 text-slate-800" />}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
