import { KeyRound, BookOpenText, Binary } from "lucide-react";
import type { ActiveTab } from "../types/ciphergen";

interface ModeTabsProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

const TABS: { id: ActiveTab; label: string; sub: string; icon: typeof KeyRound }[] = [
  {
    id: "password",
    label: "Contraseñas",
    sub: "Alta entropía 8–128",
    icon: KeyRound,
  },
  {
    id: "passphrase",
    label: "Diceware EFF",
    sub: "7,776 palabras offline",
    icon: BookOpenText,
  },
  {
    id: "keys",
    label: "PIN y Llaves",
    sub: "PIN • Hex • Base32",
    icon: Binary,
  },
];

export function ModeTabs({ activeTab, onChange }: ModeTabsProps) {
  return (
    <div
      className="cyber-panel grid grid-cols-3 gap-1.5 rounded-2xl p-1.5"
      role="tablist"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition-all sm:flex-row sm:gap-2.5 sm:px-4 ${
              isActive
                ? "text-white"
                : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
            }`}
            style={
              isActive
                ? {
                    background: "var(--accent-glow)",
                    border: "1px solid var(--border-accent)",
                  }
                : { border: "1px solid transparent" }
            }
          >
            <Icon
              className="h-4 w-4 shrink-0"
              style={isActive ? { color: "var(--accent)" } : undefined}
            />
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold sm:text-sm">
                {tab.label}
              </div>
              <div className="hidden truncate text-[11px] text-slate-400 sm:block">
                {tab.sub}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
