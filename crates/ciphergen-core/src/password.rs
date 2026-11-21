//! High-entropy random password generator with policy guarantees and zero bias.

use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use crate::analysis::{analyze_entropy, SecurityAnalysis};
use crate::csprng::Csprng;
use crate::{CipherError, GeneratedItem, GenerationMode};

pub const MIN_PASSWORD_LENGTH: usize = 8;
pub const MAX_PASSWORD_LENGTH: usize = 128;
pub const MIN_BATCH_COUNT: usize = 1;
pub const MAX_BATCH_COUNT: usize = 10;

pub const UPPERCASE_CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
pub const LOWERCASE_CHARS: &str = "abcdefghijklmnopqrstuvwxyz";
pub const DIGIT_CHARS: &str = "0123456789";
pub const SAFE_SYMBOL_CHARS: &str = "!@#$%^&*-_=+?";
pub const EXTENDED_SYMBOL_CHARS: &str = "~()[]{}<>:;.,/|\\'\"`";
pub const AMBIGUOUS_CHARS: &str = "0O1lI|";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordConfig {
    pub length: usize,
    pub uppercase: bool,
    pub lowercase: bool,
    pub numbers: bool,
    pub safe_symbols: bool,
    pub extended_symbols: bool,
    pub exclude_ambiguous: bool,
    pub count: usize,
}

impl Default for PasswordConfig {
    fn default() -> Self {
        Self {
            length: 24,
            uppercase: true,
            lowercase: true,
            numbers: true,
            safe_symbols: true,
            extended_symbols: false,
            exclude_ambiguous: true,
            count: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordBatchResult {
    pub items: Vec<GeneratedItem>,
    pub effective_alphabet_size: usize,
    pub analysis: SecurityAnalysis,
}

fn filter_chars(source: &str, exclude_ambiguous: bool) -> Vec<char> {
    source
        .chars()
        .filter(|c| !exclude_ambiguous || !AMBIGUOUS_CHARS.contains(*c))
        .collect()
}

/// Build the active character sets and combined deduplicated alphabet.
pub fn build_active_sets(config: &PasswordConfig) -> Result<(Vec<Vec<char>>, Vec<char>), CipherError> {
    if !(MIN_PASSWORD_LENGTH..=MAX_PASSWORD_LENGTH).contains(&config.length) {
        return Err(CipherError::InvalidConfig(format!(
            "La longitud debe estar entre {MIN_PASSWORD_LENGTH} y {MAX_PASSWORD_LENGTH} caracteres."
        )));
    }
    if !(MIN_BATCH_COUNT..=MAX_BATCH_COUNT).contains(&config.count) {
        return Err(CipherError::InvalidConfig(format!(
            "El lote debe estar entre {MIN_BATCH_COUNT} y {MAX_BATCH_COUNT}."
        )));
    }

    let mut active_sets: Vec<Vec<char>> = Vec::with_capacity(5);

    if config.uppercase {
        let s = filter_chars(UPPERCASE_CHARS, config.exclude_ambiguous);
        if !s.is_empty() {
            active_sets.push(s);
        }
    }
    if config.lowercase {
        let s = filter_chars(LOWERCASE_CHARS, config.exclude_ambiguous);
        if !s.is_empty() {
            active_sets.push(s);
        }
    }
    if config.numbers {
        let s = filter_chars(DIGIT_CHARS, config.exclude_ambiguous);
        if !s.is_empty() {
            active_sets.push(s);
        }
    }
    if config.safe_symbols {
        let s = filter_chars(SAFE_SYMBOL_CHARS, config.exclude_ambiguous);
        if !s.is_empty() {
            active_sets.push(s);
        }
    }
    if config.extended_symbols {
        let s = filter_chars(EXTENDED_SYMBOL_CHARS, config.exclude_ambiguous);
        if !s.is_empty() {
            active_sets.push(s);
        }
    }

    if active_sets.is_empty() {
        return Err(CipherError::InvalidConfig(
            "Debes activar al menos un conjunto de caracteres.".to_string(),
        ));
    }

    if config.length < active_sets.len() {
        return Err(CipherError::InvalidConfig(
            "La longitud es menor que el número de conjuntos activos.".to_string(),
        ));
    }

    let mut combined: Vec<char> = Vec::new();
    for set in &active_sets {
        for &ch in set {
            if !combined.contains(&ch) {
                combined.push(ch);
            }
        }
    }

    Ok((active_sets, combined))
}

/// Generate a batch of cryptographically secure random passwords.
///
/// Guarantees at least one character from each active character set, fills the
/// remaining positions uniformly from the combined effective alphabet, and applies
/// an unbiased Fisher-Yates shuffle using OS CSPRNG rejection sampling.
pub fn generate_passwords<R: Csprng>(
    rng: &mut R,
    config: &PasswordConfig,
) -> Result<PasswordBatchResult, CipherError> {
    let (active_sets, combined) = build_active_sets(config)?;
    let alphabet_size = combined.len();
    let entropy_bits = (config.length as f64) * (alphabet_size as f64).log2();
    let analysis = analyze_entropy(entropy_bits, GenerationMode::Password, alphabet_size);

    let mut items = Vec::with_capacity(config.count);

    for _ in 0..config.count {
        let mut chars: Vec<char> = Vec::with_capacity(config.length);

        // 1. Guarantee at least one character from every enabled set.
        for set in &active_sets {
            let idx = rng.random_index(set.len())?;
            chars.push(set[idx]);
        }

        // 2. Fill remaining length uniformly from the full effective alphabet.
        for _ in active_sets.len()..config.length {
            let idx = rng.random_index(alphabet_size)?;
            chars.push(combined[idx]);
        }

        // 3. Unbiased Fisher-Yates shuffle so guaranteed characters have uniform positions.
        rng.fisher_yates_shuffle(&mut chars)?;

        let value: String = chars.iter().collect();

        // Wipe temporary character buffer in memory.
        for ch in &mut chars {
            *ch = '\0';
        }
        let mut raw_wipe = vec![0u8; chars.len()];
        raw_wipe.zeroize();

        items.push(GeneratedItem {
            value,
            entropy_bits,
            mode: GenerationMode::Password,
        });
    }

    Ok(PasswordBatchResult {
        items,
        effective_alphabet_size: alphabet_size,
        analysis,
    })
}
