import { ShieldCheck, WifiOff, Cpu, Palette } from "lucide-react";
import { THEMES } from "../lib/themes";
import type { ThemeId } from "../types/ciphergen";

interface HeaderProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  isNativeRust: boolean;
}

export function Header({ theme, onThemeChange, isNativeRust }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{
            background: "var(--accent-glow)",
            borderColor: "var(--border-accent)",
            color: "var(--accent)",
          }}
        >
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Cipher<span style={{ color: "var(--accent)" }}>Gen</span>
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

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="cyber-elevated flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
          <WifiOff className="h-3.5 w-3.5 text-emerald-400" />
          <span>Offline</span>
          <span className="mx-1 text-slate-600">•</span>
          <Cpu className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span>{isNativeRust ? "Rust OS-CSPRNG" : "WebCrypto CSPRNG"}</span>
        </div>

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
