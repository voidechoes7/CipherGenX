import type { GenerationMode, RamHistoryEntry } from "../types/ciphergen";

export const MAX_RAM_HISTORY = 20;

export const MODE_LABELS: Record<GenerationMode, string> = {
  password: "Contraseña",
  passphrase: "Diceware",
  pin: "PIN",
  hexKey: "Llave Hex",
  base32Key: "Base32",
  base64UrlKey: "Base64URL",
  uuidV4: "UUID v4",
  bip39: "BIP-39",
  recoveryCode: "Código 2FA",
  vaultDerived: "Bóveda Argon2id",
};

function formatTimeNow(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

/**
 * Pure volatile RAM helper: prepends new entries up to MAX_RAM_HISTORY,
 * deduplicating consecutive identical values. NEVER touches disk or web storage.
 */
export function appendRamHistory(
  current: RamHistoryEntry[],
  incoming: {
    value: string;
    mode: GenerationMode;
    entropyBits: number;
    meta?: string;
  }[]
): RamHistoryEntry[] {
  if (incoming.length === 0) return current;
  const now = formatTimeNow();
  const next = [...current];

  for (const item of incoming) {
    if (!item.value) continue;
    if (next.length > 0 && next[0].value === item.value) {
      continue;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    next.unshift({
      id,
      value: item.value,
      mode: item.mode,
      modeLabel: MODE_LABELS[item.mode] ?? item.mode,
      entropyBits: item.entropyBits,
      createdAt: now,
      meta: item.meta,
    });
  }

  return next.slice(0, MAX_RAM_HISTORY);
}
