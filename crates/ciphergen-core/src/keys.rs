//! Cryptographically secure PINs, Hex/Base32/Base64URL keys, UUID v4 (RFC 9562),
//! BIP-39 mnemonic seed phrases (EN/ES with SHA-256 checksum), and 2FA Recovery Codes.

use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use zeroize::Zeroize;

use crate::analysis::{analyze_entropy, SecurityAnalysis};
use crate::csprng::Csprng;
use crate::password::{MAX_BATCH_COUNT, MIN_BATCH_COUNT};
use crate::{CipherError, GeneratedItem, GenerationMode};

pub const MIN_PIN_LENGTH: usize = 4;
pub const MAX_PIN_LENGTH: usize = 16;
pub const BIP39_WORDLIST_SIZE: usize = 2_048;

const BASE32_ALPHABET_UPPER: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_ALPHABET_LOWER: &[u8; 32] = b"abcdefghijklmnopqrstuvwxyz234567";
const BASE64URL_ALPHABET: &[u8; 64] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const HEX_ALPHABET_UPPER: &[u8; 16] = b"0123456789ABCDEF";
const HEX_ALPHABET_LOWER: &[u8; 16] = b"0123456789abcdef";
/// Unambiguous 31-character alphanumeric alphabet (excludes 0, O, 1, I, L) -> ~4.954 bits/char.
const RECOVERY_ALPHABET: &[u8; 31] = b"23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const RAW_BIP39_EN: &str = include_str!("../assets/bip39_english.txt");
const RAW_BIP39_ES: &str = include_str!("../assets/bip39_spanish.txt");

static BIP39_EN_WORDS: OnceLock<Vec<&'static str>> = OnceLock::new();
static BIP39_ES_WORDS: OnceLock<Vec<&'static str>> = OnceLock::new();

pub fn bip39_en_wordlist() -> &'static [&'static str] {
    BIP39_EN_WORDS
        .get_or_init(|| {
            RAW_BIP39_EN
                .lines()
                .map(str::trim)
                .filter(|line| !line.is_empty())
                .collect()
        })
        .as_slice()
}

pub fn bip39_es_wordlist() -> &'static [&'static str] {
    BIP39_ES_WORDS
        .get_or_init(|| {
            RAW_BIP39_ES
                .lines()
                .map(str::trim)
                .filter(|line| !line.is_empty())
                .collect()
        })
        .as_slice()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PinConfig {
    pub length: usize,
    pub count: usize,
}

impl Default for PinConfig {
    fn default() -> Self {
        Self {
            length: 6,
            count: 1,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum KeyFormat {
    Hex,
    Base32,
    Base64Url,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KeyBits {
    #[serde(rename = "128")]
    Bits128,
    #[serde(rename = "192")]
    Bits192,
    #[serde(rename = "256")]
    Bits256,
    #[serde(rename = "512")]
    Bits512,
}

impl KeyBits {
    pub fn bits(self) -> usize {
        match self {
            KeyBits::Bits128 => 128,
            KeyBits::Bits192 => 192,
            KeyBits::Bits256 => 256,
            KeyBits::Bits512 => 512,
        }
    }

    pub fn byte_len(self) -> usize {
        self.bits() / 8
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyConfig {
    pub format: KeyFormat,
    pub bits: KeyBits,
    pub uppercase: bool,
    pub grouped: bool,
    pub count: usize,
}

impl Default for KeyConfig {
    fn default() -> Self {
        Self {
            format: KeyFormat::Hex,
            bits: KeyBits::Bits256,
            uppercase: false,
            grouped: false,
            count: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UuidConfig {
    pub uppercase: bool,
    pub hyphens: bool,
    pub count: usize,
}

impl Default for UuidConfig {
    fn default() -> Self {
        Self {
            uppercase: false,
            hyphens: true,
            count: 1,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Bip39Language {
    En,
    Es,
}

impl Default for Bip39Language {
    fn default() -> Self {
        Self::En
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Bip39WordCount {
    #[serde(rename = "12")]
    Words12,
    #[serde(rename = "15")]
    Words15,
    #[serde(rename = "18")]
    Words18,
    #[serde(rename = "21")]
    Words21,
    #[serde(rename = "24")]
    Words24,
}

impl Bip39WordCount {
    pub fn entropy_bits(self) -> usize {
        match self {
            Self::Words12 => 128,
            Self::Words15 => 160,
            Self::Words18 => 192,
            Self::Words21 => 224,
            Self::Words24 => 256,
        }
    }

    pub fn entropy_bytes(self) -> usize {
        self.entropy_bits() / 8
    }

    pub fn word_count(self) -> usize {
        match self {
            Self::Words12 => 12,
            Self::Words15 => 15,
            Self::Words18 => 18,
            Self::Words21 => 21,
            Self::Words24 => 24,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bip39Config {
    pub word_count: Bip39WordCount,
    #[serde(default)]
    pub language: Bip39Language,
    pub count: usize,
}

impl Default for Bip39Config {
    fn default() -> Self {
        Self {
            word_count: Bip39WordCount::Words24,
            language: Bip39Language::En,
            count: 1,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RecoveryCodeFormat {
    /// XXXX-XXXX (8 chars, 40 bits)
    Blocks4x2,
    /// XXXXX-XXXXX (10 chars, 50 bits)
    Blocks5x2,
    /// XXXX-XXXX-XXXX-XXXX (16 chars, 80 bits)
    Blocks4x4,
}

impl Default for RecoveryCodeFormat {
    fn default() -> Self {
        Self::Blocks5x2
    }
}

impl RecoveryCodeFormat {
    pub fn spec(self) -> (usize, usize) {
        match self {
            Self::Blocks4x2 => (2, 4),
            Self::Blocks5x2 => (2, 5),
            Self::Blocks4x4 => (4, 4),
        }
    }

    pub fn total_chars(self) -> usize {
        let (groups, len) = self.spec();
        groups * len
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryCodeConfig {
    #[serde(default)]
    pub format: RecoveryCodeFormat,
    pub count: usize,
}

impl Default for RecoveryCodeConfig {
    fn default() -> Self {
        Self {
            format: RecoveryCodeFormat::Blocks5x2,
            count: 8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyBatchResult {
    pub items: Vec<GeneratedItem>,
    pub analysis: SecurityAnalysis,
}

/// Generate cryptographically random numeric PINs using unbiased rejection sampling on `0..10`.
pub fn generate_pins<R: Csprng>(
    rng: &mut R,
    config: &PinConfig,
) -> Result<KeyBatchResult, CipherError> {
    if !(MIN_PIN_LENGTH..=MAX_PIN_LENGTH).contains(&config.length) {
        return Err(CipherError::InvalidConfig(format!(
            "La longitud del PIN debe estar entre {MIN_PIN_LENGTH} y {MAX_PIN_LENGTH} dígitos."
        )));
    }
    if !(MIN_BATCH_COUNT..=MAX_BATCH_COUNT).contains(&config.count) {
        return Err(CipherError::InvalidConfig(format!(
            "El lote debe estar entre {MIN_BATCH_COUNT} y {MAX_BATCH_COUNT}."
        )));
    }

    let entropy_bits = (config.length as f64) * 10.0_f64.log2();
    let analysis = analyze_entropy(entropy_bits, GenerationMode::Pin, 10);

    let mut items = Vec::with_capacity(config.count);
    for _ in 0..config.count {
        let mut pin = String::with_capacity(config.length);
        for _ in 0..config.length {
            let d = rng.random_index(10)?;
            pin.push(char::from(b'0' + (d as u8)));
        }
        items.push(GeneratedItem {
            value: pin,
            entropy_bits,
            mode: GenerationMode::Pin,
        });
    }

    Ok(KeyBatchResult { items, analysis })
}

pub(crate) fn encode_hex(bytes: &[u8], uppercase: bool) -> String {
    let table = if uppercase {
        HEX_ALPHABET_UPPER
    } else {
        HEX_ALPHABET_LOWER
    };
    let mut out = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        out.push(table[(b >> 4) as usize] as char);
        out.push(table[(b & 0x0F) as usize] as char);
    }
    out
}

/// RFC 4648 Base32 encoding (no `=` padding).
fn encode_base32(bytes: &[u8], uppercase: bool) -> String {
    let table = if uppercase {
        BASE32_ALPHABET_UPPER
    } else {
        BASE32_ALPHABET_LOWER
    };
    let mut out = String::with_capacity((bytes.len() * 8).div_ceil(5));
    let mut buffer: u32 = 0;
    let mut bits_in_buffer: u32 = 0;

    for &b in bytes {
        buffer = (buffer << 8) | u32::from(b);
        bits_in_buffer += 8;
        while bits_in_buffer >= 5 {
            bits_in_buffer -= 5;
            let idx = ((buffer >> bits_in_buffer) & 0x1F) as usize;
            out.push(table[idx] as char);
        }
    }

    if bits_in_buffer > 0 {
        let idx = ((buffer << (5 - bits_in_buffer)) & 0x1F) as usize;
        out.push(table[idx] as char);
    }

    out
}

/// RFC 4648 Section 5 Base64URL encoding (URL-safe `-` and `_`, no `=` padding).
pub fn encode_base64url(bytes: &[u8]) -> String {
    let mut out = String::with_capacity((bytes.len() * 4).div_ceil(3));
    let mut i = 0;
    while i + 3 <= bytes.len() {
        let n = ((bytes[i] as u32) << 16) | ((bytes[i + 1] as u32) << 8) | (bytes[i + 2] as u32);
        out.push(BASE64URL_ALPHABET[((n >> 18) & 0x3F) as usize] as char);
        out.push(BASE64URL_ALPHABET[((n >> 12) & 0x3F) as usize] as char);
        out.push(BASE64URL_ALPHABET[((n >> 6) & 0x3F) as usize] as char);
        out.push(BASE64URL_ALPHABET[(n & 0x3F) as usize] as char);
        i += 3;
    }

    let rem = bytes.len() - i;
    if rem == 1 {
        let n = (bytes[i] as u32) << 16;
        out.push(BASE64URL_ALPHABET[((n >> 18) & 0x3F) as usize] as char);
        out.push(BASE64URL_ALPHABET[((n >> 12) & 0x3F) as usize] as char);
    } else if rem == 2 {
        let n = ((bytes[i] as u32) << 16) | ((bytes[i + 1] as u32) << 8);
        out.push(BASE64URL_ALPHABET[((n >> 18) & 0x3F) as usize] as char);
        out.push(BASE64URL_ALPHABET[((n >> 12) & 0x3F) as usize] as char);
        out.push(BASE64URL_ALPHABET[((n >> 6) & 0x3F) as usize] as char);
    }

    out
}

fn format_grouped(raw: &str, group_size: usize) -> String {
    raw.as_bytes()
        .chunks(group_size)
        .map(|chunk| std::str::from_utf8(chunk).unwrap_or_default())
        .collect::<Vec<_>>()
        .join("-")
}

/// Generate cryptographically random 128/192/256/512-bit Hex, Base32, or Base64URL keys directly from OS CSPRNG.
pub fn generate_keys<R: Csprng>(
    rng: &mut R,
    config: &KeyConfig,
) -> Result<KeyBatchResult, CipherError> {
    if !(MIN_BATCH_COUNT..=MAX_BATCH_COUNT).contains(&config.count) {
        return Err(CipherError::InvalidConfig(format!(
            "El lote debe estar entre {MIN_BATCH_COUNT} y {MAX_BATCH_COUNT}."
        )));
    }

    let byte_len = config.bits.byte_len();
    let entropy_bits = config.bits.bits() as f64;
    let (alphabet_size, mode) = match config.format {
        KeyFormat::Hex => (16, GenerationMode::HexKey),
        KeyFormat::Base32 => (32, GenerationMode::Base32Key),
        KeyFormat::Base64Url => (64, GenerationMode::Base64UrlKey),
    };
    let analysis = analyze_entropy(entropy_bits, mode, alphabet_size);

    let mut items = Vec::with_capacity(config.count);
    let mut raw_bytes = vec![0u8; byte_len];

    for _ in 0..config.count {
        rng.fill_bytes(&mut raw_bytes)?;
        let encoded = match config.format {
            KeyFormat::Hex => encode_hex(&raw_bytes, config.uppercase),
            KeyFormat::Base32 => encode_base32(&raw_bytes, config.uppercase),
            KeyFormat::Base64Url => encode_base64url(&raw_bytes),
        };
        raw_bytes.as_mut_slice().zeroize();

        let value = if config.grouped && config.format != KeyFormat::Base64Url {
            format_grouped(&encoded, 4)
        } else {
            encoded
        };

        items.push(GeneratedItem {
            value,
            entropy_bits,
            mode,
        });
    }
    raw_bytes.zeroize();

    Ok(KeyBatchResult { items, analysis })
}

/// Generate RFC 4122 / RFC 9562 UUID v4 identifiers with exact 122 bits of OS CSPRNG entropy.
pub fn generate_uuids<R: Csprng>(
    rng: &mut R,
    config: &UuidConfig,
) -> Result<KeyBatchResult, CipherError> {
    if !(MIN_BATCH_COUNT..=MAX_BATCH_COUNT).contains(&config.count) {
        return Err(CipherError::InvalidConfig(format!(
            "El lote debe estar entre {MIN_BATCH_COUNT} y {MAX_BATCH_COUNT}."
        )));
    }

    let entropy_bits = 122.0;
    let analysis = analyze_entropy(entropy_bits, GenerationMode::UuidV4, 16);

    let mut items = Vec::with_capacity(config.count);
    let mut bytes = [0u8; 16];

    for _ in 0..config.count {
        rng.fill_bytes(&mut bytes)?;
        // RFC 9562: Version 4 (0100) in high nibble of byte 6, Variant 1 (10xx) in high 2 bits of byte 8.
        bytes[6] = (bytes[6] & 0x0F) | 0x40;
        bytes[8] = (bytes[8] & 0x3F) | 0x80;

        let hex = encode_hex(&bytes, config.uppercase);
        bytes.zeroize();

        let value = if config.hyphens {
            format!(
                "{}-{}-{}-{}-{}",
                &hex[0..8],
                &hex[8..12],
                &hex[12..16],
                &hex[16..20],
                &hex[20..32]
            )
        } else {
            hex
        };

        items.push(GeneratedItem {
            value,
            entropy_bits,
            mode: GenerationMode::UuidV4,
        });
    }

    Ok(KeyBatchResult { items, analysis })
}

/// Deterministically convert raw BIP-39 entropy bytes (16, 20, 24, 28, or 32 bytes)
/// into a standard BIP-39 mnemonic with exact SHA-256 checksum bits.
pub fn entropy_to_bip39_mnemonic(
    entropy: &[u8],
    wordlist: &[&str],
) -> Result<String, CipherError> {
    let ent_bits = entropy.len() * 8;
    if !matches!(ent_bits, 128 | 160 | 192 | 224 | 256) {
        return Err(CipherError::InvalidConfig(
            "La entropía BIP-39 debe ser 128, 160, 192, 224 o 256 bits.".to_string(),
        ));
    }
    if wordlist.len() != BIP39_WORDLIST_SIZE {
        return Err(CipherError::Internal(format!(
            "Lista BIP-39 inválida: se esperaban {BIP39_WORDLIST_SIZE} palabras, se encontraron {}.",
            wordlist.len()
        )));
    }

    let checksum_bits = ent_bits / 32; // 4..=8 bits
    let hash = Sha256::digest(entropy);
    let checksum_byte = hash[0];

    let total_bits = ent_bits + checksum_bits;
    let word_count = total_bits / 11;
    let mut words = Vec::with_capacity(word_count);

    let mut bit_pos = 0usize;
    for _ in 0..word_count {
        let mut idx = 0usize;
        for _ in 0..11 {
            let bit = if bit_pos < ent_bits {
                let byte = entropy[bit_pos / 8];
                let shift = 7 - (bit_pos % 8);
                ((byte >> shift) & 1) as usize
            } else {
                let cs_bit = bit_pos - ent_bits;
                let shift = 7 - cs_bit;
                ((checksum_byte >> shift) & 1) as usize
            };
            idx = (idx << 1) | bit;
            bit_pos += 1;
        }
        words.push(wordlist[idx]);
    }

    Ok(words.join(" "))
}

/// Generate standard BIP-39 mnemonic seed phrases (12–24 words) with SHA-256 checksum.
pub fn generate_bip39<R: Csprng>(
    rng: &mut R,
    config: &Bip39Config,
) -> Result<KeyBatchResult, CipherError> {
    if !(MIN_BATCH_COUNT..=MAX_BATCH_COUNT).contains(&config.count) {
        return Err(CipherError::InvalidConfig(format!(
            "El lote debe estar entre {MIN_BATCH_COUNT} y {MAX_BATCH_COUNT}."
        )));
    }

    let wordlist = match config.language {
        Bip39Language::En => bip39_en_wordlist(),
        Bip39Language::Es => bip39_es_wordlist(),
    };

    let entropy_bits = config.word_count.entropy_bits() as f64;
    let byte_len = config.word_count.entropy_bytes();
    let analysis = analyze_entropy(entropy_bits, GenerationMode::Bip39, BIP39_WORDLIST_SIZE);

    let mut items = Vec::with_capacity(config.count);
    let mut entropy = vec![0u8; byte_len];

    for _ in 0..config.count {
        rng.fill_bytes(&mut entropy)?;
        let phrase = entropy_to_bip39_mnemonic(&entropy, wordlist)?;
        entropy.as_mut_slice().zeroize();

        items.push(GeneratedItem {
            value: phrase,
            entropy_bits,
            mode: GenerationMode::Bip39,
        });
    }
    entropy.zeroize();

    Ok(KeyBatchResult { items, analysis })
}

/// Generate unambiguous 2FA/MFA backup recovery codes (Crockford-safe 32-char alphabet, 5 bits/char).
pub fn generate_recovery_codes<R: Csprng>(
    rng: &mut R,
    config: &RecoveryCodeConfig,
) -> Result<KeyBatchResult, CipherError> {
    if !(MIN_BATCH_COUNT..=MAX_BATCH_COUNT).contains(&config.count) {
        return Err(CipherError::InvalidConfig(format!(
            "El lote debe estar entre {MIN_BATCH_COUNT} y {MAX_BATCH_COUNT}."
        )));
    }

    let (groups, block_len) = config.format.spec();
    let total_chars = config.format.total_chars();
    let entropy_bits = (total_chars as f64) * (RECOVERY_ALPHABET.len() as f64).log2();
    let analysis = analyze_entropy(
        entropy_bits,
        GenerationMode::RecoveryCode,
        RECOVERY_ALPHABET.len(),
    );

    let mut items = Vec::with_capacity(config.count);
    for _ in 0..config.count {
        let mut blocks = Vec::with_capacity(groups);
        for _ in 0..groups {
            let mut block = String::with_capacity(block_len);
            for _ in 0..block_len {
                let idx = rng.random_index(RECOVERY_ALPHABET.len())?;
                block.push(RECOVERY_ALPHABET[idx] as char);
            }
            blocks.push(block);
        }
        items.push(GeneratedItem {
            value: blocks.join("-"),
            entropy_bits,
            mode: GenerationMode::RecoveryCode,
        });
    }

    Ok(KeyBatchResult { items, analysis })
}
