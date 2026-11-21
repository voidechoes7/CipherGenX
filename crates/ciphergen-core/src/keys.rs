//! Cryptographically secure numeric PINs and 128-bit / 256-bit Hex & Base32 keys.

use serde::{Deserialize, Serialize};
use zeroize::Zeroize;

use crate::analysis::{analyze_entropy, SecurityAnalysis};
use crate::csprng::Csprng;
use crate::password::{MAX_BATCH_COUNT, MIN_BATCH_COUNT};
use crate::{CipherError, GeneratedItem, GenerationMode};

pub const MIN_PIN_LENGTH: usize = 4;
pub const MAX_PIN_LENGTH: usize = 16;

const BASE32_ALPHABET_UPPER: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_ALPHABET_LOWER: &[u8; 32] = b"abcdefghijklmnopqrstuvwxyz234567";
const HEX_ALPHABET_UPPER: &[u8; 16] = b"0123456789ABCDEF";
const HEX_ALPHABET_LOWER: &[u8; 16] = b"0123456789abcdef";

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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KeyBits {
    #[serde(rename = "128")]
    Bits128,
    #[serde(rename = "256")]
    Bits256,
}

impl KeyBits {
    pub fn bits(self) -> usize {
        match self {
            KeyBits::Bits128 => 128,
            KeyBits::Bits256 => 256,
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

fn encode_hex(bytes: &[u8], uppercase: bool) -> String {
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

fn format_grouped(raw: &str, group_size: usize) -> String {
    raw.as_bytes()
        .chunks(group_size)
        .map(|chunk| std::str::from_utf8(chunk).unwrap_or_default())
        .collect::<Vec<_>>()
        .join("-")
}

/// Generate cryptographically random 128-bit or 256-bit Hex / Base32 keys directly from OS CSPRNG.
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
    let alphabet_size = match config.format {
        KeyFormat::Hex => 16,
        KeyFormat::Base32 => 32,
    };
    let mode = match config.format {
        KeyFormat::Hex => GenerationMode::HexKey,
        KeyFormat::Base32 => GenerationMode::Base32Key,
    };
    let analysis = analyze_entropy(entropy_bits, mode, alphabet_size);

    let mut items = Vec::with_capacity(config.count);
    let mut raw_bytes = vec![0u8; byte_len];

    for _ in 0..config.count {
        rng.fill_bytes(&mut raw_bytes)?;
        let encoded = match config.format {
            KeyFormat::Hex => encode_hex(&raw_bytes, config.uppercase),
            KeyFormat::Base32 => encode_base32(&raw_bytes, config.uppercase),
        };
        raw_bytes.as_mut_slice().zeroize();

        let value = if config.grouped {
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
