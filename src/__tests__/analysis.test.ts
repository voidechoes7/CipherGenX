import { describe, expect, it } from "vitest";
import {
  analyzeCustomSecretFallback,
  analyzeEntropyLocal,
  formatDurationFromLog10Seconds,
  securityLevelFromEntropy,
} from "../lib/tauriBridge";

describe("Entropy, Penalized Real Entropy, Crack Time & Quantum Grover Analysis", () => {
  it("classifies security levels across all 5 tiers including Post-Quantum >= 256 bits", () => {
    expect(securityLevelFromEntropy(32).level).toBe("weak");
    expect(securityLevelFromEntropy(64).level).toBe("fair");
    expect(securityLevelFromEntropy(96).level).toBe("strong");
    expect(securityLevelFromEntropy(128).level).toBe("ultraStrong");
    expect(securityLevelFromEntropy(255.9).level).toBe("ultraStrong");
    expect(securityLevelFromEntropy(256).level).toBe("postQuantum");
  });

  it("halves entropy honestly for Grover's quantum algorithm", () => {
    const a128 = analyzeEntropyLocal(128, "hexKey", 16);
    expect(a128.quantumGrover.effectiveBits).toBe(64);
    expect(a128.quantumGrover.isPostQuantumSafe).toBe(false);

    const a256 = analyzeEntropyLocal(256, "hexKey", 16);
    expect(a256.quantumGrover.effectiveBits).toBe(128);
    expect(a256.quantumGrover.isPostQuantumSafe).toBe(true);
    expect(a256.levelLabel).toBe("Post-Cuántica");
  });

  it("formats extreme crack durations without floating-point overflow", () => {
    expect(formatDurationFromLog10Seconds(-3)).toContain("Instantáneo");
    expect(formatDurationFromLog10Seconds(1)).toContain("segundos");
    expect(formatDurationFromLog10Seconds(40)).toContain("edad del universo");
  });

  it("penalizes common words, leetspeak, keyboard walks, and repetitions honestly", () => {
    const leaked = analyzeCustomSecretFallback("P@ssw0rd2025!");
    expect(leaked.theoreticalEntropyBits).toBeGreaterThan(75);
    expect(leaked.entropyBits).toBeLessThan(35);
    expect(leaked.level).toBe("weak");
    expect(leaked.penalties.length).toBeGreaterThan(0);

    const repeated = analyzeCustomSecretFallback("aaaaaaaaaaaa");
    expect(repeated.entropyBits).toBeLessThan(15);
    expect(repeated.level).toBe("weak");

    const qwerty = analyzeCustomSecretFallback("qwertyuiop1234");
    expect(qwerty.entropyBits).toBeLessThan(25);
    expect(qwerty.penalties.some((p) => p.code === "keyboard_walk")).toBe(true);

    const strong = analyzeCustomSecretFallback("K9$mP2!xQ7@vL4#nR8&zW1^t");
    expect(strong.alphabetSize).toBe(94);
    expect(strong.penalties).toHaveLength(0);
    expect(strong.entropyBits).toBe(strong.theoreticalEntropyBits);
    expect(strong.entropyBits).toBeGreaterThan(150);
    expect(strong.level).toBe("ultraStrong");
  });
});
