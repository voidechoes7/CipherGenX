import { Zap, Shield, Atom, Key } from "lucide-react";

export type SecurityPresetId =
  | "daily"
  | "masterVault"
  | "postQuantum"
  | "apiBase32";

interface QuickPresetsProps {
  onSelect: (preset: SecurityPresetId) => void;
}

const PRESETS: {
  id: SecurityPresetId;
  label: string;
  tag: string;
  icon: typeof Zap;
}[] = [
  { id: "daily", label: "Uso Diario", tag: "20 chars • ~123 bits", icon: Zap },
  {
    id: "masterVault",
    label: "Bóveda Maestra",
    tag: "7 pal. EFF • ~96 bits",
    icon: Shield,
  },
  {
    id: "postQuantum",
    label: "Post-Cuántica",
    tag: "44 chars • ≥256 bits",
    icon: Atom,
  },
  {
    id: "apiBase32",
    label: "Llave API / TOTP",
    tag: "Base32 • 256 bits",
    icon: Key,
  },
];

export function QuickPresets({ onSelect }: QuickPresetsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Perfiles rápidos:
      </span>
      {PRESETS.map((p) => {
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className="cyber-elevated inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white active:scale-95"
          >
            <Icon className="h-3 w-3" style={{ color: "var(--accent)" }} />
            <span className="font-medium">{p.label}</span>
            <span className="hidden text-[10px] text-slate-500 sm:inline">
              ({p.tag})
            </span>
          </button>
        );
      })}
    </div>
  );
}
