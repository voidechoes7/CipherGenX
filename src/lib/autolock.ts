import type { AutoLockMode } from "../types/ciphergen";

const AUTOLOCK_PREF_KEY = "ciphergen_autolock_mode_v1";

export const AUTO_LOCK_OPTIONS: { value: AutoLockMode; label: string; short: string }[] = [
  { value: "0", label: "Inmediato al minimizar", short: "0s" },
  { value: "15", label: "Tras 15s oculto", short: "15s" },
  { value: "30", label: "Tras 30s oculto", short: "30s" },
  { value: "60", label: "Tras 60s oculto", short: "60s" },
  { value: "off", label: "Desactivado", short: "OFF" },
];

export function getAutoLockMode(): AutoLockMode {
  try {
    const saved =
      typeof localStorage !== "undefined"
        ? (localStorage.getItem(AUTOLOCK_PREF_KEY) as AutoLockMode | null)
        : null;
    if (
      saved === "off" ||
      saved === "0" ||
      saved === "15" ||
      saved === "30" ||
      saved === "60"
    ) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "0";
}

export function setAutoLockMode(mode: AutoLockMode): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(AUTOLOCK_PREF_KEY, mode);
    }
  } catch {
    // Ignore storage errors
  }
}

export function autoLockDelayMs(mode: AutoLockMode): number | null {
  if (mode === "off") return null;
  return Number(mode) * 1000;
}
