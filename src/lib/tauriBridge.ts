import type {
  GenerationMode,
  KeyBatchResult,
  KeyConfig,
  PassphraseBatchResult,
  PassphraseConfig,
  PasswordBatchResult,
  PasswordConfig,
  PinConfig,
  SecurityAnalysis,
  SecurityLevel,
} from "../types/ciphergen";
import { isTauriRuntime } from "./clipboard";

export const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
export const DIGIT_CHARS = "0123456789";
export const SAFE_SYMBOL_CHARS = "!@#$%^&*-_=+?";
export const EXTENDED_SYMBOL_CHARS = "~()[]{}<>:;.,/|\\'\"`";
export const AMBIGUOUS_CHARS = "0O1lI|";

const ONLINE_THROTTLED_GPS = 100 / 3600;
const GPU_FAST_HASH_GPS = 100_000_000_000;
const GPU_ARGON2ID_GPS = 10_000;

const BASE32_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_LOWER = "abcdefghijklmnopqrstuvwxyz234567";
const HEX_UPPER = "0123456789ABCDEF";
const HEX_LOWER = "0123456789abcdef";

/**
 * Compact fallback wordlist used ONLY when previewing outside Tauri (browser/Vitest).
 * Inside the compiled Tauri 2 native app, Rust uses the complete 7,776-word EFF Large Wordlist.
 */
const FALLBACK_DICEWARE_WORDS = [
  "abacus", "acorn", "admiral", "agate", "albatross", "almond", "amber", "anchor",
  "anvil", "apricot", "archway", "aurora", "badger", "bamboo", "beacon", "bison",
  "blizzard", "boulder", "bramble", "breeze", "cactus", "canyon", "caravan", "cedar",
  "chalice", "cipher", "citadel", "cobalt", "comet", "compass", "condor", "coral",
  "cosmos", "crater", "crimson", "crystal", "cypress", "dagger", "delta", "diamond",
  "dolphin", "dragon", "drift", "eclipse", "emerald", "enigma", "equinox", "falcon",
  "fathom", "feather", "flint", "forest", "fortress", "fossil", "galaxy", "garnet",
  "geyser", "glacier", "granite", "griffin", "harbor", "harvest", "horizon", "hydra",
  "iceberg", "indigo", "island", "ivory", "jackal", "jaguar", "jasper", "juniper",
  "kernel", "kestrel", "kindle", "lagoon", "lantern", "laurel", "leopard", "lichen",
  "lizard", "lotus", "magnet", "mammoth", "mantis", "marble", "meadow", "mercury",
  "meteor", "mirage", "monarch", "monolith", "nebula", "nectar", "neutron", "nimbus",
  "nomad", "obsidian", "ocelot", "octopus", "olive", "omega", "onyx", "opal",
  "oracle", "orchid", "osprey", "otter", "paladin", "panther", "paradox", "pebble",
  "pelican", "pendulum", "pepper", "phantom", "phoenix", "photon", "pioneer", "planet",
  "plasma", "platinum", "prism", "pulsar", "python", "quantum", "quartz", "quasar",
  "quiver", "radium", "raptor", "raven", "redwood", "relic", "riddle", "ripple",
  "river", "saffron", "sapphire", "saturn", "scarab", "scepter", "scroll", "sequoia",
  "shadow", "shield", "sierra", "signal", "silver", "solstice", "sparrow", "spectra",
  "sphinx", "spiral", "spruce", "starlight", "summit", "tempest", "thistle", "thunder",
  "timber", "titanium", "topaz", "torpedo", "trident", "tundra", "turbine", "twilight",
  "typhoon", "umbra", "valkyrie", "vanguard", "vector", "velvet", "vertex", "vortex",
  "voyager", "walnut", "warden", "willow", "wombat", "xenon", "yarrow", "zenith",
  "zephyr", "zircon", "zodiac", "zoom",
];

/**
 * Unbiased rejection sampling over Web Crypto CSPRNG (32-bit uniform).
 * Mirrors the exact OpenBSD arc4random_uniform rejection sampling used in Rust.
 */
export function webCryptoRandomIndex(upperBound: number): number {
  if (upperBound <= 0) {
    throw new Error("upperBound must be > 0");
  }
  if (upperBound === 1) return 0;

  const maxUint32 = 0x1_0000_0000;
  const threshold = maxUint32 % upperBound;
  const buf = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] >= threshold) {
      return buf[0] % upperBound;
    }
  }
}

export function fisherYatesShuffleWeb<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = webCryptoRandomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function securityLevelFromEntropy(entropyBits: number): {
  level: SecurityLevel;
  label: string;
} {
  if (entropyBits < 50) return { level: "weak", label: "Débil" };
  if (entropyBits < 80) return { level: "fair", label: "Aceptable" };
  if (entropyBits < 128) return { level: "strong", label: "Fuerte" };
  if (entropyBits < 256) return { level: "ultraStrong", label: "Ultra Segura" };
  return { level: "postQuantum", label: "Post-Cuántica" };
}

export function formatDurationFromLog10Seconds(log10Secs: number): string {
  if (log10Secs < -2) return "Instantáneo (< 0.01 s)";

  if (log10Secs <= 15) {
    const secs = Math.pow(10, log10Secs);
    if (secs < 1) return `${secs.toFixed(2)} segundos`;
    if (secs < 60) return `${secs.toFixed(1)} segundos`;
    const mins = secs / 60;
    if (mins < 60) return `${mins.toFixed(1)} minutos`;
    const hours = mins / 60;
    if (hours < 24) return `${hours.toFixed(1)} horas`;
    const days = hours / 24;
    if (days < 365.25) return `${days.toFixed(1)} días`;
    const years = days / 365.25;
    if (years < 1_000) return `${years.toFixed(1)} años`;
    if (years < 1_000_000) return `${(years / 1_000).toFixed(1)} mil años`;
    return `${(years / 1_000_000).toFixed(1)} millones de años`;
  }

  const log10Years = log10Secs - Math.log10(31_557_600);
  if (log10Years < 9) {
    return `${Math.pow(10, log10Years - 6).toFixed(1)} millones de años`;
  }
  if (log10Years < 12) {
    return `${Math.pow(10, log10Years - 9).toFixed(1)} mil millones de años`;
  }
  return `~10^${Math.floor(log10Years)} años (> edad del universo)`;
}

function avgCrackLog10Secs(entropyBits: number, gps: number): number {
  const avgBits = Math.max(entropyBits - 1, 0);
  return avgBits * Math.LOG10E * Math.LN2 - Math.log10(gps);
}

export function analyzeEntropyLocal(
  entropyBits: number,
  mode: GenerationMode,
  alphabetSize: number
): SecurityAnalysis {
  const clamped = Math.max(entropyBits, 0);
  const { level, label } = securityLevelFromEntropy(clamped);
  const scorePercent = Math.min(100, Math.max(0, Math.round((clamped / 256) * 100)));
  const quantumBits = clamped / 2;
  const isPostQuantumSafe = quantumBits >= 128;

  let summary: string;
  if (quantumBits < 64) {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits (Grover reduce la búsqueda a O(√N)). Vulnerable frente a un computador cuántico tolerante a fallos.`;
  } else if (quantumBits < 96) {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits bajo Grover. Adecuado hoy, pero por debajo del objetivo post-cuántico de 128 bits efectivos.`;
  } else if (quantumBits < 128) {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits bajo Grover. Fuerte resistencia clásica; alcanza ≥ 256 bits clásicos para nivel post-cuántico completo.`;
  } else {
    summary = `Margen cuántico de ${quantumBits.toFixed(1)} bits efectivos bajo Grover (≥ 128 bits). Resistente incluso ante ataques cuadráticos cuánticos.`;
  }

  const recommendations: string[] = [];
  if (level === "weak") {
    recommendations.push(
      "Entropía crítica: incrementa la longitud o añade más conjuntos de caracteres de inmediato."
    );
  } else if (level === "fair") {
    recommendations.push(
      "Aumenta la entropía por encima de 80 bits para proteger cuentas críticas frente a filtraciones de hashes rápidos."
    );
  } else if (level === "strong") {
    recommendations.push(
      "Buena fortaleza para uso diario. Para bóvedas maestras o cifrado de disco, apunta a ≥ 128 bits."
    );
  } else if (level === "ultraStrong") {
    recommendations.push(
      "Resistencia criptográfica excelente contra fuerza bruta clásica. Si buscas margen post-cuántico completo (≥ 128 bits bajo Grover), sube a ≥ 256 bits."
    );
  } else {
    recommendations.push(
      "Nivel Post-Cuántico alcanzado (≥ 256 bits clásicos / ≥ 128 bits efectivos bajo Grover). Ideal para llaves maestras y cifrado a largo plazo."
    );
  }

  if (mode === "pin") {
    recommendations.push(
      "Los PINs solo son seguros en sistemas con bloqueo por intentos fallidos o hardware seguro (TPM / Secure Enclave)."
    );
  } else if (mode === "passphrase") {
    recommendations.push(
      "Las frases Diceware EFF de 6+ palabras ofrecen alta entropía y excelente memorabilidad para contraseñas maestras."
    );
  } else if (mode === "password") {
    recommendations.push(
      "Almacena contraseñas largas en un gestor cifrado con Argon2id y nunca reutilices la misma clave entre servicios."
    );
  } else {
    recommendations.push(
      "Llave binaria de entropía exacta generada directamente desde CSPRNG; ideal para APIs, TOTP y cifrado simétrico."
    );
  }

  return {
    entropyBits: Math.round(clamped * 100) / 100,
    alphabetSize,
    level,
    levelLabel: label,
    scorePercent,
    crackTimes: {
      onlineThrottled: formatDurationFromLog10Seconds(
        avgCrackLog10Secs(clamped, ONLINE_THROTTLED_GPS)
      ),
      gpuFastHash: formatDurationFromLog10Seconds(
        avgCrackLog10Secs(clamped, GPU_FAST_HASH_GPS)
      ),
      gpuArgon2id: formatDurationFromLog10Seconds(
        avgCrackLog10Secs(clamped, GPU_ARGON2ID_GPS)
      ),
    },
    quantumGrover: {
      effectiveBits: Math.round(quantumBits * 100) / 100,
      isPostQuantumSafe,
      summary,
    },
    recommendations,
  };
}

export function generatePasswordsFallback(
  config: PasswordConfig
): PasswordBatchResult {
  if (config.length < 8 || config.length > 128) {
    throw new Error("La longitud debe estar entre 8 y 128 caracteres.");
  }
  if (config.count < 1 || config.count > 10) {
    throw new Error("El lote debe estar entre 1 y 10.");
  }

  const filter = (s: string) =>
    [...s].filter((c) => !config.excludeAmbiguous || !AMBIGUOUS_CHARS.includes(c));

  const sets: string[][] = [];
  if (config.uppercase) sets.push(filter(UPPERCASE_CHARS));
  if (config.lowercase) sets.push(filter(LOWERCASE_CHARS));
  if (config.numbers) sets.push(filter(DIGIT_CHARS));
  if (config.safeSymbols) sets.push(filter(SAFE_SYMBOL_CHARS));
  if (config.extendedSymbols) sets.push(filter(EXTENDED_SYMBOL_CHARS));

  const activeSets = sets.filter((s) => s.length > 0);
  if (activeSets.length === 0) {
    throw new Error("Debes activar al menos un conjunto de caracteres.");
  }

  const combined = Array.from(new Set(activeSets.flat()));
  const entropyBits = config.length * Math.log2(combined.length);
  const analysis = analyzeEntropyLocal(entropyBits, "password", combined.length);

  const items = Array.from({ length: config.count }, () => {
    const chars: string[] = [];
    for (const set of activeSets) {
      chars.push(set[webCryptoRandomIndex(set.length)]);
    }
    for (let i = activeSets.length; i < config.length; i++) {
      chars.push(combined[webCryptoRandomIndex(combined.length)]);
    }
    const shuffled = fisherYatesShuffleWeb(chars);
    return {
      value: shuffled.join(""),
      entropyBits,
      mode: "password" as const,
    };
  });

  return {
    items,
    effectiveAlphabetSize: combined.length,
    analysis,
  };
}

export function generatePassphrasesFallback(
  config: PassphraseConfig
): PassphraseBatchResult {
  if (config.wordCount < 4 || config.wordCount > 12) {
    throw new Error("El número de palabras debe estar entre 4 y 12.");
  }
  if (config.count < 1 || config.count > 10) {
    throw new Error("El lote debe estar entre 1 y 10.");
  }

  const wordlistSize = FALLBACK_DICEWARE_WORDS.length;
  let entropyBits = config.wordCount * Math.log2(wordlistSize);
  if (config.includeNumber) {
    entropyBits += Math.log2(config.wordCount * 10);
  }
  if (config.capitalization === "randomWord") {
    entropyBits += Math.log2(config.wordCount);
  }

  const analysis = analyzeEntropyLocal(entropyBits, "passphrase", wordlistSize);

  const items = Array.from({ length: config.count }, () => {
    const words = Array.from({ length: config.wordCount }, () => {
      const w = FALLBACK_DICEWARE_WORDS[webCryptoRandomIndex(wordlistSize)];
      if (config.capitalization === "title") {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      if (config.capitalization === "upper") {
        return w.toUpperCase();
      }
      return w;
    });

    if (config.capitalization === "randomWord") {
      const pos = webCryptoRandomIndex(config.wordCount);
      words[pos] = words[pos].toUpperCase();
    }
    if (config.includeNumber) {
      const pos = webCryptoRandomIndex(config.wordCount);
      const digit = webCryptoRandomIndex(10);
      words[pos] = `${words[pos]}${digit}`;
    }

    return {
      value: words.join(config.separator),
      entropyBits,
      mode: "passphrase" as const,
    };
  });

  return { items, wordlistSize, analysis };
}

export function generatePinsFallback(config: PinConfig): KeyBatchResult {
  if (config.length < 4 || config.length > 16) {
    throw new Error("La longitud del PIN debe estar entre 4 y 16 dígitos.");
  }
  const entropyBits = config.length * Math.log2(10);
  const analysis = analyzeEntropyLocal(entropyBits, "pin", 10);

  const items = Array.from({ length: config.count }, () => {
    let pin = "";
    for (let i = 0; i < config.length; i++) {
      pin += String(webCryptoRandomIndex(10));
    }
    return { value: pin, entropyBits, mode: "pin" as const };
  });

  return { items, analysis };
}

function encodeBase32(bytes: Uint8Array, uppercase: boolean): string {
  const table = uppercase ? BASE32_UPPER : BASE32_LOWER;
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += table[(buffer >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    out += table[(buffer << (5 - bits)) & 0x1f];
  }
  return out;
}

function encodeHex(bytes: Uint8Array, uppercase: boolean): string {
  const table = uppercase ? HEX_UPPER : HEX_LOWER;
  let out = "";
  for (const b of bytes) {
    out += table[(b >> 4) & 0x0f] + table[b & 0x0f];
  }
  return out;
}

export function generateKeysFallback(config: KeyConfig): KeyBatchResult {
  const bits = config.bits === "256" ? 256 : 128;
  const byteLen = bits / 8;
  const mode: GenerationMode = config.format === "hex" ? "hexKey" : "base32Key";
  const alphabetSize = config.format === "hex" ? 16 : 32;
  const analysis = analyzeEntropyLocal(bits, mode, alphabetSize);

  const items = Array.from({ length: config.count }, () => {
    const raw = new Uint8Array(byteLen);
    crypto.getRandomValues(raw);
    const encoded =
      config.format === "hex"
        ? encodeHex(raw, config.uppercase)
        : encodeBase32(raw, config.uppercase);
    raw.fill(0);
    const value = config.grouped
      ? encoded.replace(/(.{4})(?=.)/g, "$1-")
      : encoded;
    return { value, entropyBits: bits, mode };
  });

  return { items, analysis };
}

export function analyzeCustomSecretFallback(secret: string): SecurityAnalysis {
  const len = [...secret].length;
  if (len === 0) return analyzeEntropyLocal(0, "password", 0);

  let alphabet = 0;
  if (/[a-z]/.test(secret)) alphabet += 26;
  if (/[A-Z]/.test(secret)) alphabet += 26;
  if (/[0-9]/.test(secret)) alphabet += 10;
  if (/[^a-zA-Z0-9\s]/.test(secret)) alphabet += 32;
  if (/\s/.test(secret)) alphabet += 1;

  const entropyBits = alphabet > 1 ? len * Math.log2(alphabet) : 0;
  return analyzeEntropyLocal(entropyBits, "password", alphabet);
}

/**
 * Unified async bridge: invokes native Rust `ciphergen-core` inside Tauri 2,
 * or falls back to Web Crypto CSPRNG in browser/test environments.
 */
async function invokeTauri<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export async function generatePasswords(
  config: PasswordConfig
): Promise<PasswordBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<PasswordBatchResult>("generate_passwords_cmd", { config });
  }
  return generatePasswordsFallback(config);
}

export async function generatePassphrases(
  config: PassphraseConfig
): Promise<PassphraseBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<PassphraseBatchResult>("generate_passphrases_cmd", { config });
  }
  return generatePassphrasesFallback(config);
}

export async function generatePins(config: PinConfig): Promise<KeyBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<KeyBatchResult>("generate_pins_cmd", { config });
  }
  return generatePinsFallback(config);
}

export async function generateKeys(config: KeyConfig): Promise<KeyBatchResult> {
  if (isTauriRuntime()) {
    return invokeTauri<KeyBatchResult>("generate_keys_cmd", { config });
  }
  return generateKeysFallback(config);
}

export async function analyzeCustomSecret(
  secret: string
): Promise<SecurityAnalysis> {
  if (isTauriRuntime()) {
    return invokeTauri<SecurityAnalysis>("analyze_secret_cmd", { secret });
  }
  return analyzeCustomSecretFallback(secret);
}
