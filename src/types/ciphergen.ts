export type GenerationMode =
  | "password"
  | "passphrase"
  | "pin"
  | "hexKey"
  | "base32Key"
  | "base64UrlKey"
  | "uuidV4"
  | "bip39"
  | "recoveryCode"
  | "vaultDerived";

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

export interface EntropyPenalty {
  code: string;
  label: string;
  bitsLost: number;
  detail: string;
}

export interface SecurityAnalysis {
  entropyBits: number;
  theoreticalEntropyBits: number;
  alphabetSize: number;
  level: SecurityLevel;
  levelLabel: string;
  scorePercent: number;
  crackTimes: CrackTimeEstimates;
  quantumGrover: QuantumGroverAnalysis;
  penalties: EntropyPenalty[];
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
  customExclude: string;
  count: number;
}

export interface PasswordBatchResult {
  items: GeneratedItem[];
  effectiveAlphabetSize: number;
  analysis: SecurityAnalysis;
}

export type WordlistLanguage = "es" | "en";
export type Capitalization = "none" | "title" | "upper" | "randomWord";

export interface PassphraseConfig {
  wordCount: number;
  separator: string;
  capitalization: Capitalization;
  includeNumber: boolean;
  language: WordlistLanguage;
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

export type KeyFormat = "hex" | "base32" | "base64Url";
export type KeyBits = "128" | "192" | "256" | "512";

export interface KeyConfig {
  format: KeyFormat;
  bits: KeyBits;
  uppercase: boolean;
  grouped: boolean;
  count: number;
}

export interface UuidConfig {
  uppercase: boolean;
  hyphens: boolean;
  count: number;
}

export type Bip39Language = "en" | "es";
export type Bip39WordCount = "12" | "15" | "18" | "21" | "24";

export interface Bip39Config {
  wordCount: Bip39WordCount;
  language: Bip39Language;
  count: number;
}

export type RecoveryCodeFormat = "blocks4x2" | "blocks5x2" | "blocks4x4";

export interface RecoveryCodeConfig {
  format: RecoveryCodeFormat;
  count: number;
}

export interface KeyBatchResult {
  items: GeneratedItem[];
  analysis: SecurityAnalysis;
}

export interface VaultConfig {
  masterPassword: string;
  site: string;
  login: string;
  counter: number;
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  safeSymbols: boolean;
  extendedSymbols: boolean;
  excludeAmbiguous: boolean;
  customExclude: string;
}

export interface MasterFingerprint {
  code: string;
  symbolIndices: [number, number, number];
  hueDeg: number;
}

export interface VaultResult {
  item: GeneratedItem;
  effectiveAlphabetSize: number;
  analysis: SecurityAnalysis;
  kdfSpec: string;
  masterFingerprint: MasterFingerprint;
}

export interface RamHistoryEntry {
  id: string;
  value: string;
  mode: GenerationMode;
  modeLabel: string;
  entropyBits: number;
  createdAt: string;
  meta?: string;
}

export type ActiveTab = "password" | "passphrase" | "keys" | "vault" | "analyzer";
export type KeySubMode =
  | "pin"
  | "hex"
  | "base32"
  | "base64Url"
  | "uuid"
  | "bip39"
  | "recovery";
export type ClipboardTtl = 15 | 30 | 60;
export type AutoLockMode = "off" | "0" | "15" | "30" | "60";
export type ThemeId =
  | "obsidian"
  | "violet"
  | "matrix"
  | "amber"
  | "ios-light"
  | "cyber-light";
