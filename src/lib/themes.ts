import type { ThemeId } from "../types/ciphergen";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  swatch: string;
  accentHex: string;
  isLight: boolean;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "obsidian",
    name: "Obsidian Cyber",
    swatch: "from-cyan-400 to-emerald-400",
    accentHex: "#00f0ff",
    isLight: false,
  },
  {
    id: "violet",
    name: "Phantom Violet",
    swatch: "from-purple-400 to-pink-500",
    accentHex: "#a855f7",
    isLight: false,
  },
  {
    id: "matrix",
    name: "Matrix Terminal",
    swatch: "from-emerald-400 to-lime-400",
    accentHex: "#22c55e",
    isLight: false,
  },
  {
    id: "amber",
    name: "Stealth Amber",
    swatch: "from-amber-400 to-orange-500",
    accentHex: "#f59e0b",
    isLight: false,
  },
  {
    id: "ios-light",
    name: "iOS Frost Light",
    swatch: "from-sky-300 via-white to-blue-500",
    accentHex: "#007aff",
    isLight: true,
  },
  {
    id: "cyber-light",
    name: "Cyber Daylight",
    swatch: "from-teal-300 via-slate-100 to-indigo-500",
    accentHex: "#0d9488",
    isLight: true,
  },
];

export function isLightTheme(id: ThemeId): boolean {
  return id === "ios-light" || id === "cyber-light";
}
