#![forbid(unsafe_code)]
//! CipherGenX (`ciphergen-core`) — Pure-Rust, zero-unsafe, 100% offline
//! cryptographic generator, stateless Argon2id vault, and penalized real-entropy engine.

pub mod analysis;
pub mod csprng;
pub mod keys;
pub mod passphrase;
pub mod password;
pub mod vault;

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub use analysis::{
    analyze_custom_secret, analyze_entropy, CrackTimeEstimates, EntropyPenalty,
    QuantumGroverAnalysis, SecurityAnalysis, SecurityLevel,
};
pub use csprng::{Csprng, SystemCsprng};
pub use keys::{
    bip39_en_wordlist, bip39_es_wordlist, encode_base64url, entropy_to_bip39_mnemonic,
    generate_bip39, generate_keys, generate_pins, generate_recovery_codes, generate_uuids,
    Bip39Config, Bip39Language, Bip39WordCount, KeyBatchResult, KeyBits, KeyConfig, KeyFormat,
    PinConfig, RecoveryCodeConfig, RecoveryCodeFormat, UuidConfig, BIP39_WORDLIST_SIZE,
};
pub use passphrase::{
    eff_wordlist, es_wordlist, generate_passphrases, passphrase_entropy_bits, Capitalization,
    PassphraseBatchResult, PassphraseConfig, WordlistLanguage, EFF_WORDLIST_SIZE, ES_WORDLIST_SIZE,
};
pub use password::{
    build_active_sets, generate_passwords, PasswordBatchResult, PasswordConfig, AMBIGUOUS_CHARS,
};
pub use vault::{
    compute_master_fingerprint, derive_vault_password, derive_vault_password_with_params,
    MasterFingerprint, VaultConfig, VaultResult, VAULT_KDF_SPEC,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GenerationMode {
    Password,
    Passphrase,
    Pin,
    HexKey,
    Base32Key,
    Base64UrlKey,
    UuidV4,
    Bip39,
    RecoveryCode,
    VaultDerived,
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
    fn password_guarantees_all_active_sets_and_excludes_ambiguous_and_custom() {
        let mut rng = SystemCsprng::new();
        let custom_ex = "!@#aeiouAEIOU";
        let cfg = PasswordConfig {
            length: 20,
            uppercase: true,
            lowercase: true,
            numbers: true,
            safe_symbols: true,
            extended_symbols: true,
            exclude_ambiguous: true,
            custom_exclude: custom_ex.to_string(),
            count: 10,
        };

        let mut first_char_is_upper_count = 0usize;
        let rounds = 30;

        for _ in 0..rounds {
            let res = generate_passwords(&mut rng, &cfg).unwrap();
            assert_eq!(res.items.len(), 10);

            for item in &res.items {
                assert_eq!(item.value.chars().count(), 20);
                for amb in AMBIGUOUS_CHARS.chars() {
                    assert!(!item.value.contains(amb));
                }
                for ex in custom_ex.chars() {
                    assert!(
                        !item.value.contains(ex),
                        "Found custom-excluded char '{ex}' in {}",
                        item.value
                    );
                }
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

        assert!(
            first_char_is_upper_count < 200,
            "First char was uppercase {first_char_is_upper_count}/300 times; shuffle may be broken"
        );
    }

    #[test]
    fn password_rejects_invalid_policies() {
        let mut rng = SystemCsprng::new();

        assert!(generate_passwords(&mut rng, &PasswordConfig { length: 7, ..Default::default() }).is_err());
        assert!(generate_passwords(&mut rng, &PasswordConfig { length: 129, ..Default::default() }).is_err());
        assert!(generate_passwords(
            &mut rng,
            &PasswordConfig {
                uppercase: false,
                lowercase: false,
                numbers: false,
                safe_symbols: false,
                extended_symbols: false,
                ..Default::default()
            }
        )
        .is_err());
        // Excluding every digit when only numbers are enabled must error
        assert!(generate_passwords(
            &mut rng,
            &PasswordConfig {
                uppercase: false,
                lowercase: false,
                numbers: true,
                safe_symbols: false,
                extended_symbols: false,
                exclude_ambiguous: false,
                custom_exclude: "0123456789".to_string(),
                ..Default::default()
            }
        )
        .is_err());
    }

    #[test]
    fn eff_and_es_wordlists_are_complete_and_unique() {
        let en = eff_wordlist();
        assert_eq!(en.len(), EFF_WORDLIST_SIZE);
        let en_unique: HashSet<&str> = en.iter().copied().collect();
        assert_eq!(en_unique.len(), EFF_WORDLIST_SIZE);
        assert_eq!(en[0], "abacus");
        assert_eq!(en[EFF_WORDLIST_SIZE - 1], "zoom");

        let es = es_wordlist();
        assert_eq!(es.len(), ES_WORDLIST_SIZE);
        let es_unique: HashSet<&str> = es.iter().copied().collect();
        assert_eq!(es_unique.len(), ES_WORDLIST_SIZE);
        assert!(es.iter().all(|w| w.is_ascii() && w.chars().all(|c| c.is_ascii_lowercase())));
    }

    #[test]
    fn passphrase_generation_en_and_es_exact_entropy() {
        let mut rng = SystemCsprng::new();

        let cfg_en = PassphraseConfig {
            word_count: 6,
            separator: "-".to_string(),
            capitalization: Capitalization::Title,
            include_number: true,
            language: WordlistLanguage::En,
            count: 5,
        };
        let res_en = generate_passphrases(&mut rng, &cfg_en).unwrap();
        assert_eq!(res_en.wordlist_size, 7776);
        let expected_en = 6.0 * 7776.0_f64.log2() + 60.0_f64.log2();
        assert!((res_en.items[0].entropy_bits - expected_en).abs() < 1e-6);

        let cfg_es = PassphraseConfig {
            word_count: 6,
            separator: "-".to_string(),
            capitalization: Capitalization::None,
            include_number: false,
            language: WordlistLanguage::Es,
            count: 4,
        };
        let res_es = generate_passphrases(&mut rng, &cfg_es).unwrap();
        assert_eq!(res_es.wordlist_size, 8192);
        // 6 * log2(8192) == 6 * 13 == 78.0 exact bits!
        assert!((res_es.items[0].entropy_bits - 78.0).abs() < 1e-6);
        for item in &res_es.items {
            assert_eq!(item.value.split('-').count(), 6);
        }
    }

    #[test]
    fn bip39_matches_official_test_vectors() {
        // Official Trezor BIP-39 test vector #1: 16 zero bytes -> 12 words
        let zero16 = [0u8; 16];
        let m12 = entropy_to_bip39_mnemonic(&zero16, bip39_en_wordlist()).unwrap();
        assert_eq!(
            m12,
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        );

        // Official Trezor BIP-39 test vector: 32 bytes of 0xFF -> 24 words
        let ff32 = [0xFFu8; 32];
        let m24 = entropy_to_bip39_mnemonic(&ff32, bip39_en_wordlist()).unwrap();
        assert_eq!(
            m24,
            "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote"
        );

        // Generate real EN & ES BIP-39 mnemonics
        let mut rng = SystemCsprng::new();
        let es24 = generate_bip39(
            &mut rng,
            &Bip39Config {
                word_count: Bip39WordCount::Words24,
                language: Bip39Language::Es,
                count: 2,
            },
        )
        .unwrap();
        assert_eq!(es24.analysis.entropy_bits, 256.0);
        assert_eq!(es24.analysis.level, SecurityLevel::PostQuantum);
        for item in &es24.items {
            assert_eq!(item.value.split_whitespace().count(), 24);
        }
    }

    #[test]
    fn base64url_uuid_v4_and_recovery_codes() {
        let mut rng = SystemCsprng::new();

        // Base64URL 256-bit (32 bytes -> 43 chars, URL-safe, no '=')
        let b64 = generate_keys(
            &mut rng,
            &KeyConfig {
                format: KeyFormat::Base64Url,
                bits: KeyBits::Bits256,
                uppercase: false,
                grouped: false,
                count: 3,
            },
        )
        .unwrap();
        assert_eq!(b64.analysis.entropy_bits, 256.0);
        assert_eq!(b64.analysis.level, SecurityLevel::PostQuantum);
        for item in &b64.items {
            assert_eq!(item.value.len(), 43);
            assert!(!item.value.contains('='));
            assert!(item
                .value
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'));
        }

        // UUID v4 RFC 9562 compliance
        let uuids = generate_uuids(
            &mut rng,
            &UuidConfig {
                uppercase: false,
                hyphens: true,
                count: 5,
            },
        )
        .unwrap();
        assert_eq!(uuids.analysis.entropy_bits, 122.0);
        for item in &uuids.items {
            let parts: Vec<&str> = item.value.split('-').collect();
            assert_eq!(parts.len(), 5);
            assert_eq!(parts[0].len(), 8);
            assert_eq!(parts[1].len(), 4);
            assert_eq!(parts[2].len(), 4);
            assert_eq!(parts[3].len(), 4);
            assert_eq!(parts[4].len(), 12);
            assert!(parts[2].starts_with('4'), "UUID version nibble must be 4: {}", item.value);
            let variant = parts[3].chars().next().unwrap();
            assert!(
                matches!(variant, '8' | '9' | 'a' | 'b'),
                "UUID variant nibble must be 8/9/a/b: {}",
                item.value
            );
        }

        // 2FA Recovery Codes (no ambiguous 0/O/1/I/L)
        let codes = generate_recovery_codes(
            &mut rng,
            &RecoveryCodeConfig {
                format: RecoveryCodeFormat::Blocks5x2,
                count: 8,
            },
        )
        .unwrap();
        assert_eq!(codes.items.len(), 8);
        assert!((codes.analysis.entropy_bits - (10.0 * 31.0_f64.log2())).abs() < 0.02);
        for item in &codes.items {
            assert_eq!(item.value.len(), 11); // XXXXX-XXXXX
            assert_eq!(item.value.as_bytes()[5], b'-');
            for forbidden in ['0', 'O', '1', 'I', 'L'] {
                assert!(!item.value.contains(forbidden));
            }
        }
    }

    #[test]
    fn stateless_argon2id_vault_is_deterministic_and_sensitive() {
        let base_cfg = VaultConfig {
            master_password: "Mi-Frase-Maestra-Secreta-2026!".to_string(),
            site: "GitHub.com ".to_string(),
            login: "voidechoes7".to_string(),
            counter: 1,
            length: 20,
            uppercase: true,
            lowercase: true,
            numbers: true,
            safe_symbols: true,
            extended_symbols: false,
            exclude_ambiguous: true,
            custom_exclude: String::new(),
        };

        // Fast params for unit tests (1 MiB, t=1, p=1) to verify determinism and domain separation
        let r1 = derive_vault_password_with_params(&base_cfg, 1024, 1, 1).unwrap();
        let mut normalized_cfg = base_cfg.clone();
        normalized_cfg.site = "github.com".to_string(); // Case/trim canonicalization
        let r2 = derive_vault_password_with_params(&normalized_cfg, 1024, 1, 1).unwrap();

        assert_eq!(r1.item.value, r2.item.value, "Same canonical inputs must yield identical password");
        assert_eq!(r1.item.value.chars().count(), 20);
        assert_eq!(r1.item.mode, GenerationMode::VaultDerived);
        assert_eq!(r1.master_fingerprint, r2.master_fingerprint);

        // Changing counter must produce a completely different password
        let mut rotated_cfg = base_cfg.clone();
        rotated_cfg.counter = 2;
        let r3 = derive_vault_password_with_params(&rotated_cfg, 1024, 1, 1).unwrap();
        assert_ne!(r1.item.value, r3.item.value);

        // Changing master password by 1 char must change both derived password and fingerprint
        let mut typo_cfg = base_cfg.clone();
        typo_cfg.master_password = "Mi-Frase-Maestra-Secreta-2026?".to_string();
        let r4 = derive_vault_password_with_params(&typo_cfg, 1024, 1, 1).unwrap();
        assert_ne!(r1.item.value, r4.item.value);
        assert_ne!(r1.master_fingerprint.code, r4.master_fingerprint.code);

        // Also smoke-test production Argon2id parameters (64 MiB, t=3, p=1) once!
        let prod = derive_vault_password(&base_cfg).unwrap();
        assert_eq!(prod.item.value.chars().count(), 20);
        assert_eq!(prod.kdf_spec, VAULT_KDF_SPEC);
    }

    #[test]
    fn penalized_real_entropy_detects_weak_patterns_and_respects_random_secrets() {
        // Common password + digits + symbol: theoretical ~78.7 bits, real must drop drastically!
        let p1 = analyze_custom_secret("Password123!");
        assert!(p1.theoretical_entropy_bits > 70.0);
        assert!(
            p1.entropy_bits < 30.0,
            "Password123! real entropy should be <30 bits, got {}",
            p1.entropy_bits
        );
        assert_eq!(p1.level, SecurityLevel::Weak);
        assert!(!p1.penalties.is_empty());

        // Leetspeak + year + symbol
        let p2 = analyze_custom_secret("P@ssw0rd2025!");
        assert!(p2.entropy_bits < 35.0, "P@ssw0rd2025! got {}", p2.entropy_bits);
        assert_eq!(p2.level, SecurityLevel::Weak);

        // Repeated character spam
        let p3 = analyze_custom_secret("aaaaaaaaaaaa");
        assert!(p3.entropy_bits < 15.0, "aaaaaaaaaaaa got {}", p3.entropy_bits);
        assert_eq!(p3.level, SecurityLevel::Weak);

        // Keyboard walk
        let p4 = analyze_custom_secret("qwertyuiop1234");
        assert!(p4.entropy_bits < 25.0, "qwertyuiop1234 got {}", p4.entropy_bits);

        // Genuine high-entropy random password should NOT be penalized
        let strong = analyze_custom_secret("K9$mP2!xQ7@vL4#nR8&zW1^t");
        assert!(strong.penalties.is_empty(), "Unexpected penalties: {:?}", strong.penalties);
        assert!((strong.entropy_bits - strong.theoretical_entropy_bits).abs() < 0.01);
        assert_eq!(strong.level, SecurityLevel::UltraStrong);

        // Genuine 6-word Diceware phrase should evaluate cleanly (~77.5 bits)
        let dice = analyze_custom_secret("Abacus-Bison-Coral-Drift-Ember-Flint");
        assert!(dice.entropy_bits > 70.0 && dice.entropy_bits < 85.0);
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
