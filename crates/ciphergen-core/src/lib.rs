#![forbid(unsafe_code)]
//! CipherGenX (`ciphergen-core`) — Pure-Rust, zero-unsafe, 100% offline
//! cryptographic generator and entropy analysis engine.

pub mod analysis;
pub mod csprng;
pub mod keys;
pub mod passphrase;
pub mod password;

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub use analysis::{
    analyze_custom_secret, analyze_entropy, CrackTimeEstimates, QuantumGroverAnalysis,
    SecurityAnalysis, SecurityLevel,
};
pub use csprng::{Csprng, SystemCsprng};
pub use keys::{
    generate_keys, generate_pins, KeyBatchResult, KeyBits, KeyConfig, KeyFormat, PinConfig,
};
pub use passphrase::{
    eff_wordlist, generate_passphrases, passphrase_entropy_bits, Capitalization,
    PassphraseBatchResult, PassphraseConfig, EFF_WORDLIST_SIZE,
};
pub use password::{
    build_active_sets, generate_passwords, PasswordBatchResult, PasswordConfig, AMBIGUOUS_CHARS,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GenerationMode {
    Password,
    Passphrase,
    Pin,
    HexKey,
    Base32Key,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedItem {
    pub value: String,
    pub entropy_bits: f64,
    pub mode: GenerationMode,
}

#[derive(Debug, Error)]
pub enum CipherError {
    #[error("Configuración inválida: {0}")]
    InvalidConfig(String),
    #[error("Fallo del CSPRNG del sistema operativo: {0}")]
    RngFailure(String),
    #[error("Error interno: {0}")]
    Internal(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::{HashMap, HashSet};

    /// Deterministic mock RNG to verify that rejection sampling actually discards
    /// values below `threshold = bound.wrapping_neg() % bound`.
    struct SequenceRng {
        values: Vec<u64>,
        cursor: usize,
    }

    impl Csprng for SequenceRng {
        fn fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), CipherError> {
            let v = self.next_u64()?;
            let bytes = v.to_le_bytes();
            for (i, b) in dest.iter_mut().enumerate() {
                *b = bytes[i % 8];
            }
            Ok(())
        }

        fn next_u64(&mut self) -> Result<u64, CipherError> {
            let v = self
                .values
                .get(self.cursor)
                .copied()
                .ok_or_else(|| CipherError::RngFailure("sequence exhausted".into()))?;
            self.cursor += 1;
            Ok(v)
        }
    }

    #[test]
    fn rejection_sampling_discards_biased_values_below_threshold() {
        // For bound = 3: 2^64 mod 3 = 1, so threshold = 1.
        // Sample `0` MUST be rejected; next sample `1` MUST be accepted and yield `1 % 3 = 1`.
        let mut rng = SequenceRng {
            values: vec![0, 1],
            cursor: 0,
        };
        let result = rng.random_index(3).expect("rejection sampling should succeed");
        assert_eq!(result, 1);
        assert_eq!(rng.cursor, 2, "0 should have been rejected before accepting 1");
    }

    #[test]
    fn os_csprng_rejection_sampling_chi_squared_uniformity() {
        let mut rng = SystemCsprng::new();
        // Test non-power-of-two bound (10) over 50,000 samples.
        // Expected count per bucket = 5,000. Chi-squared df=9 critical value at p=0.0001 is ~33.72.
        let bound = 10usize;
        let samples = 50_000usize;
        let mut counts = vec![0usize; bound];
        for _ in 0..samples {
            let idx = rng.random_index(bound).unwrap();
            counts[idx] += 1;
        }
        let expected = (samples as f64) / (bound as f64);
        let chi_sq: f64 = counts
            .iter()
            .map(|&c| {
                let diff = (c as f64) - expected;
                (diff * diff) / expected
            })
            .sum();
        assert!(
            chi_sq < 35.0,
            "Chi-squared statistic too high ({chi_sq:.2}), possible modulo bias: {counts:?}"
        );
    }

    #[test]
    fn password_guarantees_all_active_sets_and_excludes_ambiguous() {
        let mut rng = SystemCsprng::new();
        let cfg = PasswordConfig {
            length: 16,
            uppercase: true,
            lowercase: true,
            numbers: true,
            safe_symbols: true,
            extended_symbols: true,
            exclude_ambiguous: true,
            count: 10,
        };

        let mut first_char_is_upper_count = 0usize;
        let rounds = 30;

        for _ in 0..rounds {
            let res = generate_passwords(&mut rng, &cfg).unwrap();
            assert_eq!(res.items.len(), 10);

            for item in &res.items {
                assert_eq!(item.value.chars().count(), 16);
                // No ambiguous characters allowed
                for amb in AMBIGUOUS_CHARS.chars() {
                    assert!(
                        !item.value.contains(amb),
                        "Found ambiguous char '{amb}' in {}",
                        item.value
                    );
                }
                // At least one from each active set
                assert!(item.value.chars().any(|c| password::UPPERCASE_CHARS.contains(c)));
                assert!(item.value.chars().any(|c| password::LOWERCASE_CHARS.contains(c)));
                assert!(item.value.chars().any(|c| password::DIGIT_CHARS.contains(c)));
                assert!(item.value.chars().any(|c| password::SAFE_SYMBOL_CHARS.contains(c)));
                assert!(item.value.chars().any(|c| password::EXTENDED_SYMBOL_CHARS.contains(c)));

                if let Some(first) = item.value.chars().next() {
                    if password::UPPERCASE_CHARS.contains(first) {
                        first_char_is_upper_count += 1;
                    }
                }
            }
        }

        // Verify Fisher-Yates shuffle actually distributes characters across index 0
        // (without shuffle, index 0 would be uppercase 100% of the time = 300/300).
        assert!(
            first_char_is_upper_count < 200,
            "First char was uppercase {first_char_is_upper_count}/300 times; shuffle may be broken"
        );
    }

    #[test]
    fn password_rejects_invalid_policies() {
        let mut rng = SystemCsprng::new();

        // Too short
        let short = PasswordConfig {
            length: 7,
            ..Default::default()
        };
        assert!(generate_passwords(&mut rng, &short).is_err());

        // Too long
        let long = PasswordConfig {
            length: 129,
            ..Default::default()
        };
        assert!(generate_passwords(&mut rng, &long).is_err());

        // No sets enabled
        let empty = PasswordConfig {
            uppercase: false,
            lowercase: false,
            numbers: false,
            safe_symbols: false,
            extended_symbols: false,
            ..Default::default()
        };
        assert!(generate_passwords(&mut rng, &empty).is_err());

        // Batch out of bounds
        let bad_batch = PasswordConfig {
            count: 11,
            ..Default::default()
        };
        assert!(generate_passwords(&mut rng, &bad_batch).is_err());
    }

    #[test]
    fn eff_wordlist_is_complete_and_unique() {
        let words = eff_wordlist();
        assert_eq!(words.len(), EFF_WORDLIST_SIZE);
        let unique: HashSet<&str> = words.iter().copied().collect();
        assert_eq!(unique.len(), EFF_WORDLIST_SIZE);
        assert_eq!(words[0], "abacus");
        assert_eq!(words[EFF_WORDLIST_SIZE - 1], "zoom");
    }

    #[test]
    fn passphrase_generation_and_exact_entropy() {
        let mut rng = SystemCsprng::new();
        let cfg = PassphraseConfig {
            word_count: 6,
            separator: "-".to_string(),
            capitalization: Capitalization::Title,
            include_number: true,
            count: 5,
        };
        let res = generate_passphrases(&mut rng, &cfg).unwrap();
        assert_eq!(res.items.len(), 5);
        assert_eq!(res.wordlist_size, 7776);

        // 6 * log2(7776) + log2(60) ≈ 77.548875 + 5.906891 ≈ 83.4558 bits
        let expected_entropy = 6.0 * 7776.0_f64.log2() + 60.0_f64.log2();
        assert!((res.items[0].entropy_bits - expected_entropy).abs() < 1e-6);
        assert_eq!(res.analysis.level, SecurityLevel::Strong);

        for item in &res.items {
            let parts: Vec<&str> = item.value.split('-').collect();
            assert_eq!(parts.len(), 6);
            assert!(
                item.value.chars().any(|c| c.is_ascii_digit()),
                "Expected a digit in passphrase: {}",
                item.value
            );
        }
    }

    #[test]
    fn pin_and_hex_base32_keys_exact_formats_and_entropy() {
        let mut rng = SystemCsprng::new();

        let pin_res = generate_pins(&mut rng, &PinConfig { length: 8, count: 4 }).unwrap();
        assert_eq!(pin_res.items.len(), 4);
        assert!((pin_res.analysis.entropy_bits - (8.0 * 10.0_f64.log2())).abs() < 0.02);
        for item in &pin_res.items {
            assert_eq!(item.value.len(), 8);
            assert!(item.value.chars().all(|c| c.is_ascii_digit()));
        }

        let hex256 = generate_keys(
            &mut rng,
            &KeyConfig {
                format: KeyFormat::Hex,
                bits: KeyBits::Bits256,
                uppercase: true,
                grouped: false,
                count: 2,
            },
        )
        .unwrap();
        assert_eq!(hex256.analysis.entropy_bits, 256.0);
        assert_eq!(hex256.analysis.level, SecurityLevel::PostQuantum);
        assert!(hex256.analysis.quantum_grover.is_post_quantum_safe);
        assert_eq!(hex256.analysis.quantum_grover.effective_bits, 128.0);
        for item in &hex256.items {
            assert_eq!(item.value.len(), 64);
            assert!(item.value.chars().all(|c| matches!(c, '0'..='9' | 'A'..='F')));
        }

        let b32_128 = generate_keys(
            &mut rng,
            &KeyConfig {
                format: KeyFormat::Base32,
                bits: KeyBits::Bits128,
                uppercase: true,
                grouped: true,
                count: 2,
            },
        )
        .unwrap();
        assert_eq!(b32_128.analysis.entropy_bits, 128.0);
        assert_eq!(b32_128.analysis.level, SecurityLevel::UltraStrong);
        assert!(!b32_128.analysis.quantum_grover.is_post_quantum_safe);
        assert_eq!(b32_128.analysis.quantum_grover.effective_bits, 64.0);
        for item in &b32_128.items {
            let ungrouped: String = item.value.chars().filter(|&c| c != '-').collect();
            assert_eq!(ungrouped.len(), 26);
            assert!(ungrouped
                .chars()
                .all(|c| matches!(c, 'A'..='Z' | '2'..='7')));
        }
    }

    #[test]
    fn analysis_levels_and_grover_halving() {
        let cases = [
            (32.0, SecurityLevel::Weak, false),
            (64.0, SecurityLevel::Fair, false),
            (100.0, SecurityLevel::Strong, false),
            (160.0, SecurityLevel::UltraStrong, false),
            (256.0, SecurityLevel::PostQuantum, true),
            (512.0, SecurityLevel::PostQuantum, true),
        ];

        for (bits, expected_level, expected_pq) in cases {
            let a = analyze_entropy(bits, GenerationMode::Password, 72);
            assert_eq!(a.level, expected_level);
            assert_eq!(a.quantum_grover.is_post_quantum_safe, expected_pq);
            assert!((a.quantum_grover.effective_bits - bits / 2.0).abs() < 1e-6);
            assert!(!a.recommendations.is_empty());
        }
    }

    #[test]
    fn fisher_yates_produces_balanced_permutations() {
        let mut rng = SystemCsprng::new();
        let mut freq: HashMap<[u8; 3], usize> = HashMap::new();
        for _ in 0..12_000 {
            let mut arr = [0u8, 1, 2];
            rng.fisher_yates_shuffle(&mut arr).unwrap();
            *freq.entry(arr).or_insert(0) += 1;
        }
        assert_eq!(freq.len(), 6);
        for (&perm, &count) in &freq {
            assert!(
                (1750..=2250).contains(&count),
                "Permutation {perm:?} occurred {count} times (expected ~2000)"
            );
        }
    }
}
