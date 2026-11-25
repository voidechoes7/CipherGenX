import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { formatNatoPlaintext, spellNato } from "../lib/nato";
import { appendRamHistory, MAX_RAM_HISTORY } from "../lib/ramHistory";
import {
  computeMasterFingerprintFallback,
  deriveVaultPasswordFallback,
} from "../lib/tauriBridge";
import type { RamHistoryEntry } from "../types/ciphergen";

describe("CipherGenX v1.1.0 features (NATO, QR offline, RAM history, Stateless Vault)", () => {
  it("spells uppercase, lowercase, digits, and symbols unambiguously in NATO phonetic", () => {
    const tokens = spellNato("Ak7$ ");
    expect(tokens).toHaveLength(5);
    expect(tokens[0]).toMatchObject({ char: "A", word: "ALFA", category: "upper" });
    expect(tokens[1]).toMatchObject({ char: "k", word: "kilo", category: "lower" });
    expect(tokens[2]).toMatchObject({ char: "7", word: "Siete", category: "digit" });
    expect(tokens[3]).toMatchObject({ char: "$", word: "Dólar", category: "symbol" });
    expect(tokens[4]).toMatchObject({ char: "␣", word: "Espacio", category: "space" });

    const plain = formatNatoPlaintext("Az9!");
    expect(plain).toContain("ALFA (MAYÚS)");
    expect(plain).toContain("zulu (minús)");
    expect(plain).toContain("Nueve");
    expect(plain).toContain("Exclamación");
  });

  it("generates an offline QR matrix synchronously without network calls", () => {
    const qr = QRCode.create("K9$mP2!xQ7@vL4#nR8&zW1^t", {
      errorCorrectionLevel: "M",
    });
    expect(qr.modules.size).toBeGreaterThanOrEqual(21);
    let darkCount = 0;
    for (let y = 0; y < qr.modules.size; y++) {
      for (let x = 0; x < qr.modules.size; x++) {
        if (qr.modules.get(x, y)) darkCount += 1;
      }
    }
    expect(darkCount).toBeGreaterThan(50);
  });

  it("manages volatile RAM history with deduplication and MAX_RAM_HISTORY cap", () => {
    let history: RamHistoryEntry[] = [];
    for (let i = 0; i < MAX_RAM_HISTORY + 5; i++) {
      history = appendRamHistory(history, [
        { value: `secret-${i}`, mode: "password", entropyBits: 128 },
      ]);
    }
    expect(history).toHaveLength(MAX_RAM_HISTORY);
    expect(history[0].value).toBe(`secret-${MAX_RAM_HISTORY + 4}`);

    // Duplicate of latest entry should not duplicate
    const dedup = appendRamHistory(history, [
      { value: `secret-${MAX_RAM_HISTORY + 4}`, mode: "password", entropyBits: 128 },
    ]);
    expect(dedup).toHaveLength(MAX_RAM_HISTORY);
  });

  it("derives deterministic vault passwords and distinct master fingerprints", async () => {
    const baseCfg = {
      masterPassword: "Super-Master-Phrase-2026!",
      site: "GitHub.com ",
      login: "voidechoes7",
      counter: 1,
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      safeSymbols: true,
      extendedSymbols: false,
      excludeAmbiguous: true,
      customExclude: "",
    };

    const r1 = await deriveVaultPasswordFallback(baseCfg);
    const r2 = await deriveVaultPasswordFallback({
      ...baseCfg,
      site: "github.com",
    });
    expect(r1.item.value).toBe(r2.item.value);
    expect(r1.item.value).toHaveLength(20);
    expect(r1.masterFingerprint.code).toBe(r2.masterFingerprint.code);

    const rotated = await deriveVaultPasswordFallback({
      ...baseCfg,
      counter: 2,
    });
    expect(rotated.item.value).not.toBe(r1.item.value);

    const fp1 = await computeMasterFingerprintFallback("MasterA");
    const fp2 = await computeMasterFingerprintFallback("MasterB");
    expect(fp1.code).not.toBe(fp2.code);
  });
});
