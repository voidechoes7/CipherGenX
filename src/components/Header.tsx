import { WifiOff, Cpu, Palette, ShieldOff } from "lucide-react";
import { THEMES } from "../lib/themes";
import type { ThemeId } from "../types/ciphergen";

interface HeaderProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  isNativeRust: boolean;
  onPanicWipe: () => void;
}

export function Header({
  theme,
  onThemeChange,
  isNativeRust,
  onPanicWipe,
}: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            alt="CipherGenX Neon Cyber Shield"
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
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Generador criptográfico CSPRNG • 100% Offline • Sin telemetría
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="cyber-elevated flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
          <WifiOff className="h-3.5 w-3.5 text-emerald-400" />
          <span>Offline</span>
          <span className="mx-1 text-slate-600">•</span>
          <Cpu className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span>{isNativeRust ? "Rust OS-CSPRNG" : "WebCrypto CSPRNG"}</span>
        </div>

        <button
          type="button"
          onClick={onPanicWipe}
          title="Limpiar secretos en pantalla y portapapeles (Esc)"
          className="cyber-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:border-rose-500/50 hover:bg-rose-950/30"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Limpiar RAM</span>
        </button>

        <div
          className="cyber-elevated flex items-center gap-1.5 rounded-lg px-2 py-1"
          role="group"
          aria-label="Selector de tema"
        >
          <Palette className="ml-1 h-3.5 w-3.5 text-slate-400" />
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                title={t.name}
                onClick={() => onThemeChange(t.id)}
                className={`h-5 w-5 rounded-md bg-gradient-to-br ${t.swatch} transition-transform ${
                  active
                    ? "scale-110 ring-2 ring-white/90 ring-offset-1 ring-offset-slate-950"
                    : "opacity-60 hover:opacity-100"
                }`}
                aria-label={`Tema ${t.name}`}
              />
            );
          })}
        </div>
      </div>
    </header>
  );
}
