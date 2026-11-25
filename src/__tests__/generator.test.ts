import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS_CHARS,
  DIGIT_CHARS,
  EXTENDED_SYMBOL_CHARS,
  LOWERCASE_CHARS,
  SAFE_SYMBOL_CHARS,
  UPPERCASE_CHARS,
  generateBip39Fallback,
  generateKeysFallback,
  generatePassphrasesFallback,
  generatePasswordsFallback,
  generatePinsFallback,
  generateRecoveryCodesFallback,
  generateUuidsFallback,
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

  it("guarantees at least 1 character from each active set and excludes ambiguous + custom chars", () => {
    const customExclude = "!@#aeiouAEIOU";
    const result = generatePasswordsFallback({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      safeSymbols: true,
      extendedSymbols: true,
      excludeAmbiguous: true,
      customExclude,
      count: 10,
    });

    expect(result.items).toHaveLength(10);
    for (const item of result.items) {
      expect([...item.value]).toHaveLength(20);
      for (const amb of AMBIGUOUS_CHARS) {
        expect(item.value).not.toContain(amb);
      }
      for (const ex of customExclude) {
        expect(item.value).not.toContain(ex);
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

  it("rejects out-of-range password lengths, empty sets, and over-exclusion", () => {
    expect(() =>
      generatePasswordsFallback({
        length: 7,
        uppercase: true,
        lowercase: true,
        numbers: true,
        safeSymbols: false,
        extendedSymbols: false,
        excludeAmbiguous: false,
        customExclude: "",
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
        customExclude: "",
        count: 1,
      })
    ).toThrow();

    expect(() =>
      generatePasswordsFallback({
        length: 16,
        uppercase: false,
        lowercase: false,
        numbers: true,
        safeSymbols: false,
        extendedSymbols: false,
        excludeAmbiguous: false,
        customExclude: "0123456789",
        count: 1,
      })
    ).toThrow();
  });

  it("generates Diceware passphrases in ES and EN with custom separators and optional digits", () => {
    const resEs = generatePassphrasesFallback({
      wordCount: 6,
      separator: "_",
      capitalization: "title",
      includeNumber: true,
      language: "es",
      count: 4,
    });
    expect(resEs.items).toHaveLength(4);
    for (const item of resEs.items) {
      expect(item.value.split("_")).toHaveLength(6);
      expect(/\d/.test(item.value)).toBe(true);
    }

    const resEn = generatePassphrasesFallback({
      wordCount: 5,
      separator: "-",
      capitalization: "none",
      includeNumber: false,
      language: "en",
      count: 2,
    });
    expect(resEn.items).toHaveLength(2);
    for (const item of resEn.items) {
      expect(item.value.split("-")).toHaveLength(5);
    }
  });

  it("generates PINs, Hex, Base32, Base64URL, UUID v4, BIP-39, and 2FA Recovery Codes", () => {
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
      expect(k.value.replace(/-/g, "")).toMatch(/^[A-Z2-7]{26}$/);
    }

    const b64u = generateKeysFallback({
      format: "base64Url",
      bits: "256",
      uppercase: false,
      grouped: false,
      count: 2,
    });
    expect(b64u.analysis.entropyBits).toBe(256);
    for (const k of b64u.items) {
      expect(k.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }

    const uuids = generateUuidsFallback({
      uppercase: false,
      hyphens: true,
      count: 4,
    });
    expect(uuids.analysis.entropyBits).toBe(122);
    for (const u of uuids.items) {
      expect(u.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    }

    const bip39 = generateBip39Fallback({
      wordCount: "24",
      language: "en",
      count: 2,
    });
    expect(bip39.analysis.entropyBits).toBe(256);
    for (const m of bip39.items) {
      expect(m.value.split(" ")).toHaveLength(24);
    }

    const codes = generateRecoveryCodesFallback({
      format: "blocks5x2",
      count: 8,
    });
    expect(codes.items).toHaveLength(8);
    expect(codes.analysis.entropyBits).toBeCloseTo(10 * Math.log2(31), 1);
    for (const c of codes.items) {
      expect(c.value).toMatch(/^[2-9A-HJ-KM-NP-Z]{5}-[2-9A-HJ-KM-NP-Z]{5}$/);
    }
  });
});
