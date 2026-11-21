import { describe, expect, it } from "vitest";
import {
  analyzeCustomSecretFallback,
  analyzeEntropyLocal,
  formatDurationFromLog10Seconds,
  securityLevelFromEntropy,
} from "../lib/tauriBridge";

describe("Entropy, Crack Time & Quantum Grover Analysis", () => {
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

  it("analyzes custom secrets locally based on effective alphabet", () => {
    const weak = analyzeCustomSecretFallback("123456");
    expect(weak.level).toBe("weak");
    expect(weak.alphabetSize).toBe(10);

    const strong = analyzeCustomSecretFallback("K9$mP2!xQ7@vL4#nR8&zW1^t");
    expect(strong.alphabetSize).toBe(94);
    expect(strong.entropyBits).toBeGreaterThan(150);
    expect(strong.level).toBe("ultraStrong");
  });
});
