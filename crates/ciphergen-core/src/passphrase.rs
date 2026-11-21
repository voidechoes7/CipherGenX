//! Offline Diceware passphrase generator backed by the official 7,776-word EFF Large Wordlist.

use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

use crate::analysis::{analyze_entropy, SecurityAnalysis};
use crate::csprng::Csprng;
use crate::password::{MAX_BATCH_COUNT, MIN_BATCH_COUNT};
use crate::{CipherError, GeneratedItem, GenerationMode};

pub const MIN_WORD_COUNT: usize = 4;
pub const MAX_WORD_COUNT: usize = 12;
pub const EFF_WORDLIST_SIZE: usize = 7_776;

const RAW_EFF_WORDLIST: &str = include_str!("../assets/eff_large_wordlist.txt");

static WORDLIST: OnceLock<Vec<&'static str>> = OnceLock::new();

/// Return the parsed 7,776-word EFF Large Wordlist embedded offline in the binary.
pub fn eff_wordlist() -> &'static [&'static str] {
    WORDLIST
        .get_or_init(|| {
            RAW_EFF_WORDLIST
                .lines()
                .filter_map(|line| {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        return None;
                    }
                    trimmed.split_whitespace().nth(1)
                })
                .collect()
        })
        .as_slice()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Capitalization {
    None,
    Title,
    Upper,
    RandomWord,
}

impl Default for Capitalization {
    fn default() -> Self {
        Self::Title
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PassphraseConfig {
    pub word_count: usize,
    pub separator: String,
    pub capitalization: Capitalization,
    pub include_number: bool,
    pub count: usize,
}

impl Default for PassphraseConfig {
    fn default() -> Self {
        Self {
            word_count: 6,
            separator: "-".to_string(),
            capitalization: Capitalization::Title,
            include_number: true,
            count: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PassphraseBatchResult {
    pub items: Vec<GeneratedItem>,
    pub wordlist_size: usize,
    pub analysis: SecurityAnalysis,
}

fn title_case(word: &str) -> String {
    let mut chars = word.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => {
            let mut out = first.to_uppercase().to_string();
            out.push_str(chars.as_str());
            out
        }
    }
}

/// Compute exact entropy in bits for a Diceware passphrase configuration.
pub fn passphrase_entropy_bits(config: &PassphraseConfig, wordlist_size: usize) -> f64 {
    let base = (config.word_count as f64) * (wordlist_size as f64).log2();
    let number_bonus = if config.include_number {
        // Choosing 1 of `word_count` positions and 1 of 10 digits (0-9) uniformly.
        ((config.word_count * 10) as f64).log2()
    } else {
        0.0
    };
    let cap_bonus = if config.capitalization == Capitalization::RandomWord {
        (config.word_count as f64).log2()
    } else {
        0.0
    };
    base + number_bonus + cap_bonus
}

/// Generate a batch of offline EFF Diceware passphrases using unbiased CSPRNG sampling.
pub fn generate_passphrases<R: Csprng>(
    rng: &mut R,
    config: &PassphraseConfig,
) -> Result<PassphraseBatchResult, CipherError> {
    if !(MIN_WORD_COUNT..=MAX_WORD_COUNT).contains(&config.word_count) {
        return Err(CipherError::InvalidConfig(format!(
            "El número de palabras debe estar entre {MIN_WORD_COUNT} y {MAX_WORD_COUNT}."
        )));
    }
    if !(MIN_BATCH_COUNT..=MAX_BATCH_COUNT).contains(&config.count) {
        return Err(CipherError::InvalidConfig(format!(
            "El lote debe estar entre {MIN_BATCH_COUNT} y {MAX_BATCH_COUNT}."
        )));
    }
    if config.separator.chars().count() > 4 {
        return Err(CipherError::InvalidConfig(
            "El separador no puede superar los 4 caracteres.".to_string(),
        ));
    }

    let words = eff_wordlist();
    if words.len() != EFF_WORDLIST_SIZE {
        return Err(CipherError::Internal(format!(
            "Lista EFF corrupta: se esperaban {EFF_WORDLIST_SIZE} palabras, se encontraron {}.",
            words.len()
        )));
    }

    let entropy_bits = passphrase_entropy_bits(config, words.len());
    let analysis = analyze_entropy(entropy_bits, GenerationMode::Passphrase, words.len());

    let mut items = Vec::with_capacity(config.count);

    for _ in 0..config.count {
        let mut chosen: Vec<String> = Vec::with_capacity(config.word_count);
        for _ in 0..config.word_count {
            let idx = rng.random_index(words.len())?;
            let raw_word = words[idx];
            let formatted = match config.capitalization {
                Capitalization::None | Capitalization::RandomWord => raw_word.to_string(),
                Capitalization::Title => title_case(raw_word),
                Capitalization::Upper => raw_word.to_uppercase(),
            };
            chosen.push(formatted);
        }

        if config.capitalization == Capitalization::RandomWord {
            let cap_pos = rng.random_index(config.word_count)?;
            chosen[cap_pos] = chosen[cap_pos].to_uppercase();
        }

        if config.include_number {
            let num_pos = rng.random_index(config.word_count)?;
            let digit = rng.random_index(10)?;
            chosen[num_pos].push(char::from(b'0' + (digit as u8)));
        }

        let value = chosen.join(&config.separator);

        items.push(GeneratedItem {
            value,
            entropy_bits,
            mode: GenerationMode::Passphrase,
        });
    }

    Ok(PassphraseBatchResult {
        items,
        wordlist_size: words.len(),
        analysis,
    })
}
