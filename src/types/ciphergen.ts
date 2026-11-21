export type GenerationMode =
  | "password"
  | "passphrase"
  | "pin"
  | "hexKey"
  | "base32Key";

export type SecurityLevel =
  | "weak"
  | "fair"
  | "strong"
  | "ultraStrong"
  | "postQuantum";

export interface GeneratedItem {
  value: string;
  entropyBits: number;
  mode: GenerationMode;
}

export interface CrackTimeEstimates {
  onlineThrottled: string;
  gpuFastHash: string;
  gpuArgon2id: string;
}

export interface QuantumGroverAnalysis {
  effectiveBits: number;
  isPostQuantumSafe: boolean;
  summary: string;
}

export interface SecurityAnalysis {
  entropyBits: number;
  alphabetSize: number;
  level: SecurityLevel;
  levelLabel: string;
  scorePercent: number;
  crackTimes: CrackTimeEstimates;
  quantumGrover: QuantumGroverAnalysis;
  recommendations: string[];
}

export interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  safeSymbols: boolean;
  extendedSymbols: boolean;
  excludeAmbiguous: boolean;
  count: number;
}

export interface PasswordBatchResult {
  items: GeneratedItem[];
  effectiveAlphabetSize: number;
  analysis: SecurityAnalysis;
}

export type Capitalization = "none" | "title" | "upper" | "randomWord";

export interface PassphraseConfig {
  wordCount: number;
  separator: string;
  capitalization: Capitalization;
  includeNumber: boolean;
  count: number;
}

export interface PassphraseBatchResult {
  items: GeneratedItem[];
  wordlistSize: number;
  analysis: SecurityAnalysis;
}

export interface PinConfig {
  length: number;
  count: number;
}

export type KeyFormat = "hex" | "base32";
export type KeyBits = "128" | "256";

export interface KeyConfig {
  format: KeyFormat;
  bits: KeyBits;
  uppercase: boolean;
  grouped: boolean;
  count: number;
}

export interface KeyBatchResult {
  items: GeneratedItem[];
  analysis: SecurityAnalysis;
}

export type ActiveTab = "password" | "passphrase" | "keys";
export type KeySubMode = "pin" | "hex" | "base32";
export type ClipboardTtl = 15 | 30 | 60;
export type ThemeId = "obsidian" | "violet" | "matrix" | "amber";
