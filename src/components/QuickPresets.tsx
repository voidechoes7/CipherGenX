import { Zap, Shield, Atom, Key, Sprout, Fingerprint } from "lucide-react";

export type SecurityPresetId =
  | "daily"
  | "masterVault"
  | "postQuantum"
  | "bip39Seed"
  | "apiBase64Url"
  | "recoveryKit";

interface QuickPresetsProps {
  onSelect: (preset: SecurityPresetId) => void;
}

const PRESETS: {
  id: SecurityPresetId;
  label: string;
  tag: string;
  icon: typeof Zap;
}[] = [
  { id: "daily", label: "Uso Diario", tag: "20 chars • ~123b", icon: Zap },
  {
    id: "masterVault",
    label: "Diceware ES",
    tag: "7 pal. • ~97b",
    icon: Shield,
  },
  {
    id: "postQuantum",
    label: "Post-Cuántica",
    tag: "44 chars • ≥256b",
    icon: Atom,
  },
  {
    id: "bip39Seed",
    label: "Semilla BIP-39",
    tag: "24 pal. • 256b",
    icon: Sprout,
  },
  {
    id: "apiBase64Url",
    label: "Token API",
    tag: "Base64URL • 256b",
    icon: Key,
  },
  {
    id: "recoveryKit",
    label: "Kit 2FA (8)",
    tag: "XXXXX-XXXXX",
    icon: Fingerprint,
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
