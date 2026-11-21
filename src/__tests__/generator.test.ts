import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS_CHARS,
  DIGIT_CHARS,
  EXTENDED_SYMBOL_CHARS,
  LOWERCASE_CHARS,
  SAFE_SYMBOL_CHARS,
  UPPERCASE_CHARS,
  generateKeysFallback,
  generatePassphrasesFallback,
  generatePasswordsFallback,
  generatePinsFallback,
  webCryptoRandomIndex,
} from "../lib/tauriBridge";

describe("CSPRNG rejection sampling & generators (WebCrypto fallback)", () => {
  it("produces unbiased uniform distribution on non-power-of-two bound (chi-squared)", () => {
    const bound = 10;
    const samples = 20_000;
    const counts = new Array<number>(bound).fill(0);
    for (let i = 0; i < samples; i++) {
      counts[webCryptoRandomIndex(bound)] += 1;
    }
    const expected = samples / bound;
    const chiSq = counts.reduce(
      (acc, c) => acc + ((c - expected) * (c - expected)) / expected,
      0
    );
    expect(chiSq).toBeLessThan(35);
  });

  it("guarantees at least 1 character from each active set and excludes ambiguous chars", () => {
    const result = generatePasswordsFallback({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      safeSymbols: true,
      extendedSymbols: true,
      excludeAmbiguous: true,
      count: 10,
    });

    expect(result.items).toHaveLength(10);
    for (const item of result.items) {
      expect([...item.value]).toHaveLength(20);
      for (const amb of AMBIGUOUS_CHARS) {
        expect(item.value).not.toContain(amb);
      }
      expect([...item.value].some((c) => UPPERCASE_CHARS.includes(c))).toBe(true);
      expect([...item.value].some((c) => LOWERCASE_CHARS.includes(c))).toBe(true);
      expect([...item.value].some((c) => DIGIT_CHARS.includes(c))).toBe(true);
      expect([...item.value].some((c) => SAFE_SYMBOL_CHARS.includes(c))).toBe(true);
      expect([...item.value].some((c) => EXTENDED_SYMBOL_CHARS.includes(c))).toBe(
        true
      );
    }
  });

  it("rejects out-of-range password lengths and empty character sets", () => {
    expect(() =>
      generatePasswordsFallback({
        length: 7,
        uppercase: true,
        lowercase: true,
        numbers: true,
        safeSymbols: false,
        extendedSymbols: false,
        excludeAmbiguous: false,
        count: 1,
      })
    ).toThrow();

    expect(() =>
      generatePasswordsFallback({
        length: 16,
        uppercase: false,
        lowercase: false,
        numbers: false,
        safeSymbols: false,
        extendedSymbols: false,
        excludeAmbiguous: false,
        count: 1,
      })
    ).toThrow();
  });

  it("generates Diceware passphrases with custom separators and optional digits", () => {
    const res = generatePassphrasesFallback({
      wordCount: 6,
      separator: "_",
      capitalization: "title",
      includeNumber: true,
      count: 4,
    });

    expect(res.items).toHaveLength(4);
    for (const item of res.items) {
      const parts = item.value.split("_");
      expect(parts).toHaveLength(6);
      expect(/\d/.test(item.value)).toBe(true);
    }
  });

  it("generates cryptographic PINs and exact 128/256-bit Hex & Base32 keys", () => {
    const pins = generatePinsFallback({ length: 8, count: 3 });
    expect(pins.items).toHaveLength(3);
    for (const p of pins.items) {
      expect(p.value).toMatch(/^\d{8}$/);
    }

    const hex256 = generateKeysFallback({
      format: "hex",
      bits: "256",
      uppercase: true,
      grouped: false,
      count: 2,
    });
    expect(hex256.analysis.entropyBits).toBe(256);
    expect(hex256.analysis.level).toBe("postQuantum");
    for (const k of hex256.items) {
      expect(k.value).toMatch(/^[0-9A-F]{64}$/);
    }

    const b32 = generateKeysFallback({
      format: "base32",
      bits: "128",
      uppercase: true,
      grouped: true,
      count: 2,
    });
    expect(b32.analysis.entropyBits).toBe(128);
    for (const k of b32.items) {
      const clean = k.value.replace(/-/g, "");
      expect(clean).toMatch(/^[A-Z2-7]{26}$/);
    }
  });
});
