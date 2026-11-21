//! Real-time 100% local entropy, crack-time, and quantum Grover margin analyzer.

use serde::{Deserialize, Serialize};

use crate::GenerationMode;

/// Average online rate-limited attack: 100 guesses per hour (~0.0278 guesses/sec).
pub const ONLINE_THROTTLED_GPS: f64 = 100.0 / 3600.0;
/// Modern GPU cluster cracking fast unsalted hashes (MD5 / SHA-256 / NTLM): 100 GH/s.
pub const GPU_FAST_HASH_GPS: f64 = 100_000_000_000.0;
/// Modern GPU cluster cracking memory-hard Argon2id (64 MiB, t=3, p=4): ~10,000 H/s.
pub const GPU_ARGON2ID_GPS: f64 = 10_000.0;

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
pub struct SecurityAnalysis {
    pub entropy_bits: f64,
    pub alphabet_size: usize,
    pub level: SecurityLevel,
    pub level_label: String,
    pub score_percent: u8,
    pub crack_times: CrackTimeEstimates,
    pub quantum_grover: QuantumGroverAnalysis,
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

    // Up to 10^15 seconds (~31.7 million years) we can safely use f64 seconds directly.
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

    // Convert log10(seconds) -> log10(years) (1 year = 31,557,600 s => log10 ≈ 7.4991)
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
                "Las frases Diceware EFF de 6+ palabras ofrecen alta entropía y excelente memorabilidad para contraseñas maestras."
                    .to_string(),
            );
        }
        GenerationMode::Password => {
            recommendations.push(
                "Almacena contraseñas largas en un gestor cifrado con Argon2id y nunca reutilices la misma clave entre servicios."
                    .to_string(),
            );
        }
        GenerationMode::HexKey | GenerationMode::Base32Key => {
            recommendations.push(
                "Llave binaria de entropía exacta generada directamente desde el CSPRNG del sistema operativo; ideal para APIs, TOTP y cifrado simétrico."
                    .to_string(),
            );
        }
    }

    SecurityAnalysis {
        entropy_bits: (clamped_bits * 100.0).round() / 100.0,
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
        recommendations,
    }
}

/// Inspect an arbitrary user-supplied string locally by estimating its effective alphabet size.
pub fn analyze_custom_secret(secret: &str) -> SecurityAnalysis {
    let len = secret.chars().count();
    if len == 0 {
        return analyze_entropy(0.0, GenerationMode::Password, 0);
    }

    let mut has_lower = false;
    let mut has_upper = false;
    let mut has_digit = false;
    let mut has_symbol = false;
    let mut has_space = false;
    let mut has_unicode = false;

    for ch in secret.chars() {
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

    let entropy_bits = if alphabet > 1 {
        (len as f64) * (alphabet as f64).log2()
    } else {
        0.0
    };

    analyze_entropy(entropy_bits, GenerationMode::Password, alphabet)
}
