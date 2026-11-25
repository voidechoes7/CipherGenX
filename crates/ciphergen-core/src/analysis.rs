//! Real-time 100% local entropy, penalized real-entropy analysis, crack-time,
//! and quantum Grover margin analyzer.

use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

use crate::passphrase::{eff_wordlist, es_wordlist};
use crate::GenerationMode;

/// Average online rate-limited attack: 100 guesses per hour (~0.0278 guesses/sec).
pub const ONLINE_THROTTLED_GPS: f64 = 100.0 / 3600.0;
/// Modern GPU cluster cracking fast unsalted hashes (MD5 / SHA-256 / NTLM): 100 GH/s.
pub const GPU_FAST_HASH_GPS: f64 = 100_000_000_000.0;
/// Modern GPU cluster cracking memory-hard Argon2id (64 MiB, t=3, p=4): ~10,000 H/s.
pub const GPU_ARGON2ID_GPS: f64 = 10_000.0;

/// Top commonly breached passwords & frequent weak base words (ES + EN).
const COMMON_WEAK_WORDS: &[&str] = &[
    "password", "passw0rd", "contraseña", "contrasena", "admin", "administrator", "root",
    "qwerty", "qwertyuiop", "asdfgh", "zxcvbn", "letmein", "welcome", "bienvenido",
    "iloveyou", "teamo", "tequiero", "monkey", "dragon", "baseball", "football", "futbol",
    "superman", "batman", "spiderman", "master", "maestro", "shadow", "sunshine", "princess",
    "princesa", "estrella", "starwars", "pokemon", "naruto", "minecraft", "fortnite",
    "secreto", "secret", "clave", "usuario", "login", "acceso", "cuenta", "sistema",
    "familia", "amigos", "amor", "corazon", "hola", "holamundo", "prueba", "test",
    "colombia", "mexico", "espana", "argentina", "chile", "peru", "venezuela", "ecuador",
    "madrid", "barcelona", "bogota", "medellin", "lima", "buenosaires", "santiago",
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre", "diciembre", "lunes", "martes", "miercoles",
    "jueves", "viernes", "sabado", "domingo", "january", "february", "march", "april",
    "august", "september", "october", "november", "december", "summer", "winter",
    "verano", "invierno", "primavera", "otono", "google", "facebook", "instagram",
    "twitter", "netflix", "amazon", "apple", "microsoft", "windows", "android", "iphone",
    "samsung", "github", "bitcoin", "crypto", "cipher", "hacker", "matrix", "security",
    "seguridad", "libertad", "freedom", "forever", "siempre", "gracias", "dinero", "money",
    "banco", "bank", "tarjeta", "correo", "email", "trabajo", "escuela", "universidad",
    "computadora", "internet", "wifi", "router", "casa", "perro", "gato", "tigre", "leon",
    "aguila", "lobo", "fenix", "fuego", "agua", "tierra", "viento", "cielo", "luna",
    "estrella", "sol", "noche", "dia", "vida", "mundo", "tiempo", "musica", "deporte",
    "carlos", "maria", "jose", "juan", "luis", "miguel", "david", "daniel", "diego",
    "andres", "alejandro", "sofia", "valentina", "camila", "lucia", "mateo", "santiago",
    "sebastian", "nicolas", "fernando", "roberto", "eduardo", "ricardo", "gabriel",
    "angel", "jesus", "cristian", "jorge", "pedro", "pablo", "antonio", "francisco",
    "manuel", "javier", "sergio", "rafael", "alberto", "raul", "oscar", "hector",
    "victor", "adrian", "martin", "ivan", "mario", "alex", "laura", "paula", "andrea",
    "carmen", "elena", "ana", "sara", "claudia", "patricia", "monica", "veronica",
];

const KEYBOARD_ROWS: &[&str] = &[
    "1234567890",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
    "qazwsxedcrfvtgbyhnujmikolp",
    "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p",
    "qweasdzxc",
    "7894561230",
];

static DICT_SET: OnceLock<HashSet<&'static str>> = OnceLock::new();

fn combined_dictionary() -> &'static HashSet<&'static str> {
    DICT_SET.get_or_init(|| {
        let mut set = HashSet::with_capacity(16_500);
        for &w in eff_wordlist() {
            set.insert(w);
        }
        for &w in es_wordlist() {
            set.insert(w);
        }
        for &w in COMMON_WEAK_WORDS {
            set.insert(w);
        }
        set
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SecurityLevel {
    Weak,
    Fair,
    Strong,
    UltraStrong,
    PostQuantum,
}

impl SecurityLevel {
    pub fn from_entropy(entropy_bits: f64) -> Self {
        if entropy_bits < 50.0 {
            Self::Weak
        } else if entropy_bits < 80.0 {
            Self::Fair
        } else if entropy_bits < 128.0 {
            Self::Strong
        } else if entropy_bits < 256.0 {
            Self::UltraStrong
        } else {
            Self::PostQuantum
        }
    }

    pub fn label_es(self) -> &'static str {
        match self {
            Self::Weak => "Débil",
            Self::Fair => "Aceptable",
            Self::Strong => "Fuerte",
            Self::UltraStrong => "Ultra Segura",
            Self::PostQuantum => "Post-Cuántica",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrackTimeEstimates {
    pub online_throttled: String,
    pub gpu_fast_hash: String,
    pub gpu_argon2id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuantumGroverAnalysis {
    pub effective_bits: f64,
    pub is_post_quantum_safe: bool,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntropyPenalty {
    pub code: String,
    pub label: String,
    pub bits_lost: f64,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityAnalysis {
    pub entropy_bits: f64,
    pub theoretical_entropy_bits: f64,
    pub alphabet_size: usize,
    pub level: SecurityLevel,
    pub level_label: String,
    pub score_percent: u8,
    pub crack_times: CrackTimeEstimates,
    pub quantum_grover: QuantumGroverAnalysis,
    pub penalties: Vec<EntropyPenalty>,
    pub recommendations: Vec<String>,
}

/// Compute average-case crack time in log10(seconds) for `entropy_bits` at `guesses_per_second`.
/// Average case inspects 50% of the keyspace: $2^{H - 1} / R$.
fn avg_crack_log10_seconds(entropy_bits: f64, guesses_per_second: f64) -> f64 {
    let avg_bits = (entropy_bits - 1.0).max(0.0);
    avg_bits * std::f64::consts::LOG10_2 - guesses_per_second.log10()
}

/// Format an estimated crack duration given in `log10(seconds)` into a clear Spanish string.
pub fn format_duration_from_log10_seconds(log10_secs: f64) -> String {
    if log10_secs < -2.0 {
        return "Instantáneo (< 0.01 s)".to_string();
    }

    if log10_secs <= 15.0 {
        let secs = 10.0_f64.powf(log10_secs);
        if secs < 1.0 {
            return format!("{:.2} segundos", secs);
        }
        if secs < 60.0 {
            return format!("{:.1} segundos", secs);
        }
        let mins = secs / 60.0;
        if mins < 60.0 {
            return format!("{:.1} minutos", mins);
        }
        let hours = mins / 60.0;
        if hours < 24.0 {
            return format!("{:.1} horas", hours);
        }
        let days = hours / 24.0;
        if days < 365.25 {
            return format!("{:.1} días", days);
        }
        let years = days / 365.25;
        if years < 1_000.0 {
            return format!("{:.1} años", years);
        }
        if years < 1_000_000.0 {
            return format!("{:.1} mil años", years / 1_000.0);
        }
        return format!("{:.1} millones de años", years / 1_000_000.0);
    }

    let log10_years = log10_secs - 31_557_600.0_f64.log10();
    if log10_years < 9.0 {
        let millions = 10.0_f64.powf(log10_years - 6.0);
        format!("{:.1} millones de años", millions)
    } else if log10_years < 12.0 {
        let billions = 10.0_f64.powf(log10_years - 9.0);
        format!("{:.1} mil millones de años", billions)
    } else {
        let exp = log10_years.floor() as i64;
        format!("~10^{exp} años (> edad del universo)")
    }
}

/// Analyze exact entropy bits and produce crack-time estimates, Grover quantum margin,
/// classification, and actionable recommendations.
pub fn analyze_entropy(
    entropy_bits: f64,
    mode: GenerationMode,
    alphabet_size: usize,
) -> SecurityAnalysis {
    let clamped_bits = entropy_bits.max(0.0);
    let rounded_bits = (clamped_bits * 100.0).round() / 100.0;
    let level = SecurityLevel::from_entropy(clamped_bits);
    let score_percent = ((clamped_bits / 256.0) * 100.0).clamp(0.0, 100.0).round() as u8;

    let crack_times = CrackTimeEstimates {
        online_throttled: format_duration_from_log10_seconds(avg_crack_log10_seconds(
            clamped_bits,
            ONLINE_THROTTLED_GPS,
        )),
        gpu_fast_hash: format_duration_from_log10_seconds(avg_crack_log10_seconds(
            clamped_bits,
            GPU_FAST_HASH_GPS,
        )),
        gpu_argon2id: format_duration_from_log10_seconds(avg_crack_log10_seconds(
            clamped_bits,
            GPU_ARGON2ID_GPS,
        )),
    };

    let quantum_bits = clamped_bits / 2.0;
    let is_pq_safe = quantum_bits >= 128.0;
    let quantum_summary = if quantum_bits < 64.0 {
        format!(
            "Margen cuántico de {:.1} bits (Grover reduce la búsqueda a O(√N)). Vulnerable frente a un computador cuántico tolerante a fallos.",
            quantum_bits
        )
    } else if quantum_bits < 96.0 {
        format!(
            "Margen cuántico de {:.1} bits bajo Grover. Adecuado hoy, pero por debajo del objetivo post-cuántico de 128 bits efectivos.",
            quantum_bits
        )
    } else if quantum_bits < 128.0 {
        format!(
            "Margen cuántico de {:.1} bits bajo Grover. Fuerte resistencia clásica y margen cuántico elevado; alcanza ≥ 256 bits clásicos para nivel post-cuántico completo.",
            quantum_bits
        )
    } else {
        format!(
            "Margen cuántico de {:.1} bits efectivos bajo Grover (≥ 128 bits). Resistente incluso ante ataques cuadráticos cuánticos.",
            quantum_bits
        )
    };

    let mut recommendations = Vec::new();
    match level {
        SecurityLevel::Weak => {
            recommendations.push(
                "Entropía crítica: incrementa la longitud o añade más conjuntos de caracteres de inmediato."
                    .to_string(),
            );
        }
        SecurityLevel::Fair => {
            recommendations.push(
                "Aumenta la entropía por encima de 80 bits para proteger cuentas críticas frente a filtraciones de hashes rápidos."
                    .to_string(),
            );
        }
        SecurityLevel::Strong => {
            recommendations.push(
                "Buena fortaleza para uso diario. Para bóvedas maestras o cifrado de disco, apunta a ≥ 128 bits."
                    .to_string(),
            );
        }
        SecurityLevel::UltraStrong => {
            recommendations.push(
                "Resistencia criptográfica excelente contra fuerza bruta clásica. Si buscas margen post-cuántico completo (≥ 128 bits bajo Grover), sube a ≥ 256 bits."
                    .to_string(),
            );
        }
        SecurityLevel::PostQuantum => {
            recommendations.push(
                "Nivel Post-Cuántico alcanzado (≥ 256 bits clásicos / ≥ 128 bits efectivos bajo Grover). Ideal para llaves maestras y cifrado a largo plazo."
                    .to_string(),
            );
        }
    }

    match mode {
        GenerationMode::Pin => {
            recommendations.push(
                "Los PINs solo son seguros en sistemas con bloqueo por intentos fallidos o hardware seguro (TPM / Secure Enclave)."
                    .to_string(),
            );
        }
        GenerationMode::Passphrase => {
            recommendations.push(
                "Las frases Diceware (ES 8,192 / EFF 7,776) de 6+ palabras ofrecen alta entropía y excelente memorabilidad para contraseñas maestras."
                    .to_string(),
            );
        }
        GenerationMode::Password => {
            recommendations.push(
                "Almacena contraseñas largas en un gestor cifrado con Argon2id y nunca reutilices la misma clave entre servicios."
                    .to_string(),
            );
        }
        GenerationMode::HexKey | GenerationMode::Base32Key | GenerationMode::Base64UrlKey => {
            recommendations.push(
                "Llave o token binario de entropía exacta generado directamente desde el CSPRNG del sistema operativo; ideal para APIs, JWT, TOTP y cifrado simétrico."
                    .to_string(),
            );
        }
        GenerationMode::UuidV4 => {
            recommendations.push(
                "UUID v4 (RFC 9562) con 122 bits de entropía pura CSPRNG; ideal como identificador único no predecible y tokens internos."
                    .to_string(),
            );
        }
        GenerationMode::Bip39 => {
            recommendations.push(
                "Semilla BIP-39 estándar con suma de verificación SHA-256. Guárdala únicamente en papel o metal offline; jamás en capturas de pantalla ni en la nube."
                    .to_string(),
            );
        }
        GenerationMode::RecoveryCode => {
            recommendations.push(
                "Códigos de recuperación 2FA sin caracteres ambiguos (~4.95 bits/carácter). Imprímelos o guárdalos en una bóveda física separada."
                    .to_string(),
            );
        }
        GenerationMode::VaultDerived => {
            recommendations.push(
                "Clave determinista derivada localmente con Argon2id (64 MiB). No se almacena en disco."
                    .to_string(),
            );
        }
    }

    SecurityAnalysis {
        entropy_bits: rounded_bits,
        theoretical_entropy_bits: rounded_bits,
        alphabet_size,
        level,
        level_label: level.label_es().to_string(),
        score_percent,
        crack_times,
        quantum_grover: QuantumGroverAnalysis {
            effective_bits: (quantum_bits * 100.0).round() / 100.0,
            is_post_quantum_safe: is_pq_safe,
            summary: quantum_summary,
        },
        penalties: Vec::new(),
        recommendations,
    }
}

fn normalize_leetspeak(s: &str) -> String {
    s.chars()
        .map(|c| match c.to_ascii_lowercase() {
            '0' => 'o',
            '1' | '!' => 'i',
            '3' => 'e',
            '4' | '@' => 'a',
            '5' | '$' => 's',
            '7' => 't',
            '8' => 'b',
            other => other,
        })
        .collect()
}

fn find_keyboard_walk_len(lower: &str) -> usize {
    let mut best = 0usize;
    for &row in KEYBOARD_ROWS {
        let rev: String = row.chars().rev().collect();
        for pattern in [row, rev.as_str()] {
            let p_bytes = pattern.as_bytes();
            for win_len in (3..=p_bytes.len().min(lower.len())).rev() {
                if win_len <= best {
                    break;
                }
                for start in 0..=(p_bytes.len() - win_len) {
                    let slice = &pattern[start..start + win_len];
                    if lower.contains(slice) {
                        best = win_len;
                        break;
                    }
                }
            }
        }
    }
    best
}

fn longest_sequential_run(chars: &[char]) -> usize {
    if chars.len() < 3 {
        return 0;
    }
    let mut max_run = 1usize;
    let mut cur_run = 1usize;
    let mut prev_diff: Option<i32> = None;

    for w in chars.windows(2) {
        let a = w[0].to_ascii_lowercase();
        let b = w[1].to_ascii_lowercase();
        let same_class =
            (a.is_ascii_alphabetic() && b.is_ascii_alphabetic()) || (a.is_ascii_digit() && b.is_ascii_digit());
        if same_class {
            let diff = (b as i32) - (a as i32);
            if diff == 1 || diff == -1 {
                if prev_diff == Some(diff) {
                    cur_run += 1;
                } else {
                    cur_run = 2;
                    prev_diff = Some(diff);
                }
                max_run = max_run.max(cur_run);
                continue;
            }
        }
        cur_run = 1;
        prev_diff = None;
    }
    if max_run >= 3 {
        max_run
    } else {
        0
    }
}

fn has_repeated_chunk(s: &str) -> Option<usize> {
    let chars: Vec<char> = s.chars().collect();
    let n = chars.len();
    for chunk_len in 2..=(n / 2) {
        for i in 0..=(n - chunk_len * 2) {
            if chars[i..i + chunk_len] == chars[i + chunk_len..i + chunk_len * 2] {
                return Some(chunk_len);
            }
        }
    }
    None
}

fn contains_year_or_date(s: &str) -> bool {
    let chars: Vec<char> = s.chars().collect();
    for w in chars.windows(4) {
        if w.iter().all(|c| c.is_ascii_digit()) {
            let val = (w[0] as u32 - '0' as u32) * 1000
                + (w[1] as u32 - '0' as u32) * 100
                + (w[2] as u32 - '0' as u32) * 10
                + (w[3] as u32 - '0' as u32);
            if (1900..=2099).contains(&val) {
                return true;
            }
        }
    }
    false
}

/// Detect whether the user typed a genuine multi-word Diceware-like passphrase
/// (e.g., 4+ distinct alphabetic words separated by a consistent delimiter).
fn detect_passphrase_word_count(secret: &str) -> Option<usize> {
    for sep in ['-', '_', ' ', '.', '/'] {
        let parts: Vec<&str> = secret.split(sep).filter(|p| !p.is_empty()).collect();
        if parts.len() >= 4 {
            let dict = combined_dictionary();
            let mut distinct = HashSet::new();
            let mut dict_hits = 0usize;
            let mut all_word_like = true;
            for part in &parts {
                let clean: String = part
                    .chars()
                    .filter(|c| c.is_ascii_alphabetic())
                    .map(|c| c.to_ascii_lowercase())
                    .collect();
                if clean.len() < 3 || clean.len() + 2 < part.chars().count() {
                    all_word_like = false;
                    break;
                }
                if dict.contains(clean.as_str()) {
                    dict_hits += 1;
                }
                distinct.insert(clean);
            }
            if all_word_like && distinct.len() >= 4 && dict_hits * 2 >= parts.len() {
                return Some(distinct.len());
            }
        }
    }
    None
}

fn shannon_entropy_bits(chars: &[char]) -> f64 {
    if chars.is_empty() {
        return 0.0;
    }
    let mut freq: HashMap<char, usize> = HashMap::new();
    for &c in chars {
        *freq.entry(c).or_insert(0) += 1;
    }
    let len = chars.len() as f64;
    let h_per_char: f64 = freq
        .values()
        .map(|&count| {
            let p = (count as f64) / len;
            -p * p.log2()
        })
        .sum();
    h_per_char * len
}

/// Inspect an arbitrary user-supplied string locally with real penalized entropy.
///
/// Penalizes leaked/common dictionary words (ES + EN + leetspeak), keyboard walks,
/// alphabetical/numeric sequences, character/block repetitions, dates/years,
/// predictable human rules (`Word + Digits + Symbol`), and low Shannon diversity.
pub fn analyze_custom_secret(secret: &str) -> SecurityAnalysis {
    let chars: Vec<char> = secret.chars().collect();
    let len = chars.len();
    if len == 0 {
        return analyze_entropy(0.0, GenerationMode::Password, 0);
    }

    let mut has_lower = false;
    let mut has_upper = false;
    let mut has_digit = false;
    let mut has_symbol = false;
    let mut has_space = false;
    let mut has_unicode = false;

    for &ch in &chars {
        if ch.is_ascii_lowercase() {
            has_lower = true;
        } else if ch.is_ascii_uppercase() {
            has_upper = true;
        } else if ch.is_ascii_digit() {
            has_digit = true;
        } else if ch == ' ' {
            has_space = true;
        } else if ch.is_ascii_punctuation() {
            has_symbol = true;
        } else {
            has_unicode = true;
        }
    }

    let mut alphabet = 0usize;
    if has_lower {
        alphabet += 26;
    }
    if has_upper {
        alphabet += 26;
    }
    if has_digit {
        alphabet += 10;
    }
    if has_symbol {
        alphabet += 32;
    }
    if has_space {
        alphabet += 1;
    }
    if has_unicode {
        alphabet += 64;
    }

    let bits_per_char = if alphabet > 1 {
        (alphabet as f64).log2()
    } else {
        0.0
    };
    let theoretical_bits = (len as f64) * bits_per_char;

    // Recognize genuine multi-word Diceware passphrases so we evaluate them honestly
    // (~12.9 bits/word) instead of falsely penalizing each dictionary word as a single weak password.
    if let Some(word_count) = detect_passphrase_word_count(secret) {
        let passphrase_real_bits = (word_count as f64) * 7776.0_f64.log2();
        let effective_bits = passphrase_real_bits.min(theoretical_bits);
        let mut res = analyze_entropy(effective_bits, GenerationMode::Passphrase, 7_776);
        res.theoretical_entropy_bits = (theoretical_bits * 100.0).round() / 100.0;
        if theoretical_bits - effective_bits > 1.0 {
            res.penalties.push(EntropyPenalty {
                code: "passphrase_model".to_string(),
                label: "Modelo de Frase de Paso".to_string(),
                bits_lost: ((theoretical_bits - effective_bits) * 100.0).round() / 100.0,
                detail: format!(
                    "Se detectó una frase de {word_count} palabras de diccionario: evaluada por entropía real de palabras (~12.9 bits/palabra) en lugar de caracteres aleatorios."
                ),
            });
        }
        return res;
    }

    let mut penalties: Vec<EntropyPenalty> = Vec::new();
    let mut total_penalty = 0.0_f64;
    let mut hard_cap: Option<f64> = None;

    let lower = secret.to_lowercase();
    let leet = normalize_leetspeak(secret);
    let dict = combined_dictionary();

    // 1. Common password / dictionary word detection (including leetspeak)
    let clean_alpha: String = leet.chars().filter(|c| c.is_ascii_alphabetic()).collect();
    let exact_common = COMMON_WEAK_WORDS
        .iter()
        .any(|&w| lower == w || leet == w || clean_alpha == w && len <= w.len() + 4);

    if exact_common {
        let cap = if lower == clean_alpha { 10.0 } else { 18.0 };
        let loss = (theoretical_bits - cap).max(0.0);
        if loss > 0.5 {
            penalties.push(EntropyPenalty {
                code: "common_password".to_string(),
                label: "Contraseña Común / Filtrada".to_string(),
                bits_lost: (loss * 10.0).round() / 10.0,
                detail: "Coincide con palabras o claves frecuentes en diccionarios de ataques (incluyendo sustituciones leetspeak como @/0/3).".to_string(),
            });
            hard_cap = Some(hard_cap.map_or(cap, |c| c.min(cap)));
        }
    } else {
        // Substring check against common weak words and embedded dictionaries (words >= 4 chars)
        let mut matched_word: Option<&str> = None;
        for &w in COMMON_WEAK_WORDS {
            if w.len() >= 4 && (lower.contains(w) || leet.contains(w)) {
                if matched_word.map_or(true, |prev| w.len() > prev.len()) {
                    matched_word = Some(w);
                }
            }
        }
        if matched_word.is_none() && clean_alpha.len() >= 5 && dict.contains(clean_alpha.as_str()) {
            matched_word = Some(clean_alpha.as_str());
        }
        if let Some(w) = matched_word {
            // A dictionary word contributes at most ~11 bits regardless of character length.
            let word_theoretical = (w.len() as f64) * bits_per_char;
            let loss = (word_theoretical - 11.0).max(8.0);
            total_penalty += loss;
            penalties.push(EntropyPenalty {
                code: "dictionary_word".to_string(),
                label: "Palabra de Diccionario".to_string(),
                bits_lost: (loss * 10.0).round() / 10.0,
                detail: format!(
                    "Contiene la palabra predecible \"{w}\" (detectada incluso con leetspeak): un atacante por diccionario reduce drásticamente el espacio de búsqueda."
                ),
            });
        }
    }

    // 2. Keyboard walk detection (QWERTY rows / diagonals)
    let kb_len = find_keyboard_walk_len(&lower);
    if kb_len >= 4 {
        let loss = ((kb_len as f64) * bits_per_char - 6.0).max(10.0);
        total_penalty += loss;
        penalties.push(EntropyPenalty {
            code: "keyboard_walk".to_string(),
            label: "Patrón de Teclado (QWERTY)".to_string(),
            bits_lost: (loss * 10.0).round() / 10.0,
            detail: format!(
                "Secuencia de {kb_len} teclas adyacentes en el teclado; las herramientas de cracking prueban recorridos QWERTY en milisegundos."
            ),
        });
    }

    // 3. Alphabetical or numeric sequences (abcd, 1234, 9876)
    let seq_len = longest_sequential_run(&chars);
    if seq_len >= 3 {
        let loss = ((seq_len as f64) * bits_per_char - 4.0).max(8.0);
        total_penalty += loss;
        penalties.push(EntropyPenalty {
            code: "sequence".to_string(),
            label: "Secuencia Alfanumérica".to_string(),
            bits_lost: (loss * 10.0).round() / 10.0,
            detail: format!(
                "Contiene una secuencia ordenada de {seq_len} caracteres consecutivos (ej. 1234 o abcd)."
            ),
        });
    }

    // 4. Character & chunk repetitions + low Shannon diversity
    let unique_count = chars.iter().collect::<HashSet<_>>().len();
    let has_triple_repeat = chars.windows(3).any(|w| w[0] == w[1] && w[1] == w[2]);
    let repeated_chunk = has_repeated_chunk(secret);

    if has_triple_repeat || repeated_chunk.is_some() {
        let loss = if let Some(clen) = repeated_chunk {
            ((clen as f64) * bits_per_char * 0.85).max(10.0)
        } else {
            (2.5 * bits_per_char).max(8.0)
        };
        total_penalty += loss;
        penalties.push(EntropyPenalty {
            code: "repetition".to_string(),
            label: "Caracteres o Bloques Repetidos".to_string(),
            bits_lost: (loss * 10.0).round() / 10.0,
            detail: "Contiene caracteres idénticos seguidos (aaa) o bloques repetidos (abcabc), reduciendo la imprevisibilidad real.".to_string(),
        });
    }

    // Diversity / Shannon check: prevents strings like "aabbccaabbcc" or "111111111111" from scoring high.
    if len >= 6 {
        let unique_ratio = (unique_count as f64) / (len as f64);
        if unique_count <= 2 {
            let cap = (len as f64).log2() + 3.0;
            let loss = (theoretical_bits - cap).max(0.0);
            if loss > 1.0 {
                penalties.push(EntropyPenalty {
                    code: "extreme_low_diversity".to_string(),
                    label: "Diversidad Críticamente Baja".to_string(),
                    bits_lost: (loss * 10.0).round() / 10.0,
                    detail: format!(
                        "Solo usa {unique_count} carácter(es) único(s) en {len} posiciones."
                    ),
                });
                hard_cap = Some(hard_cap.map_or(cap, |c| c.min(cap)));
            }
        } else if unique_ratio < 0.55 {
            let shannon = shannon_entropy_bits(&chars);
            let effective_cap = (shannon * 1.45).max((unique_count as f64) * bits_per_char * 0.9);
            if effective_cap < theoretical_bits - 6.0 {
                let loss = theoretical_bits - effective_cap;
                total_penalty += loss;
                penalties.push(EntropyPenalty {
                    code: "low_diversity".to_string(),
                    label: "Baja Diversidad (Shannon)".to_string(),
                    bits_lost: (loss * 10.0).round() / 10.0,
                    detail: format!(
                        "Solo {unique_count} caracteres únicos de {len} totales; entropía de Shannon baja ({shannon:.1} bits)."
                    ),
                });
            }
        }
    }

    // 5. Year / date pattern (1900–2099)
    if contains_year_or_date(secret) {
        let loss = (4.0 * bits_per_char - 7.5).max(7.0);
        total_penalty += loss;
        penalties.push(EntropyPenalty {
            code: "date_year".to_string(),
            label: "Año o Fecha Detectada".to_string(),
            bits_lost: (loss * 10.0).round() / 10.0,
            detail: "Contiene un año (1900–2099) o fecha predecible (~7.5 bits reales en vez de 4 dígitos aleatorios).".to_string(),
        });
    }

    // 6. Predictable human pattern: Capitalized word + trailing digits/symbol (e.g. Dragon2025!)
    let first_upper_only = chars.first().is_some_and(|c| c.is_ascii_uppercase())
        && chars.iter().skip(1).filter(|c| c.is_ascii_uppercase()).count() == 0;
    let trailing_symbol_only = chars.last().is_some_and(|c| c.is_ascii_punctuation())
        && chars
            .iter()
            .take(len.saturating_sub(1))
            .filter(|c| c.is_ascii_punctuation())
            .count()
            == 0;
    if len >= 6 && first_upper_only && trailing_symbol_only && has_digit && !penalties.is_empty() {
        let loss = 12.0;
        total_penalty += loss;
        penalties.push(EntropyPenalty {
            code: "human_rule".to_string(),
            label: "Regla Humana Predecible".to_string(),
            bits_lost: loss,
            detail: "Patrón clásico Mayúscula-inicial + dígitos + símbolo-final (!/?/@): los ataques por reglas de Hashcat lo resuelven muy rápido.".to_string(),
        });
    }

    let mut real_entropy = (theoretical_bits - total_penalty).max(0.0);
    if let Some(cap) = hard_cap {
        real_entropy = real_entropy.min(cap);
    }

    let mut result = analyze_entropy(real_entropy, GenerationMode::Password, alphabet);
    result.theoretical_entropy_bits = (theoretical_bits * 100.0).round() / 100.0;
    result.penalties = penalties;

    if len < 12 {
        result.recommendations.insert(
            0,
            "Longitud corta (< 12 caracteres): usa al menos 16–24 caracteres aleatorios o una frase Diceware de 6+ palabras."
                .to_string(),
        );
    }
    if !result.penalties.is_empty() {
        let lost = (result.theoretical_entropy_bits - result.entropy_bits).max(0.0);
        result.recommendations.insert(
            0,
            format!(
                "Se penalizaron -{lost:.1} bits por patrones humanos/predecibles. Genera una clave aleatoria con CSPRNG para alcanzar entropía real completa."
            ),
        );
    }

    result
}
