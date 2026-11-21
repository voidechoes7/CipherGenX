import type { ThemeId } from "../types/ciphergen";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  swatch: string;
  accentHex: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "obsidian",
    name: "Obsidian Cyber",
    swatch: "from-cyan-400 to-emerald-400",
    accentHex: "#00f0ff",
  },
  {
    id: "violet",
    name: "Phantom Violet",
    swatch: "from-purple-400 to-pink-500",
    accentHex: "#a855f7",
  },
  {
    id: "matrix",
    name: "Matrix Terminal",
    swatch: "from-emerald-400 to-lime-400",
    accentHex: "#22c55e",
  },
  {
    id: "amber",
    name: "Stealth Amber",
    swatch: "from-amber-400 to-orange-500",
    accentHex: "#f59e0b",
  },
];
