//! Stateless deterministic password vault powered by Argon2id (RFC 9106).
//!
//! Derives the exact same high-entropy password across any device (Windows, Linux, Android, iOS)
//! from `(master_password, site, login, counter, policy)` with ZERO storage on disk.

use argon2::{Algorithm, Argon2, Params, Version};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use zeroize::Zeroize;

use crate::analysis::SecurityAnalysis;
use crate::csprng::Csprng;
use crate::keys::encode_hex;
use crate::password::{generate_passwords, PasswordConfig};
use crate::{CipherError, GeneratedItem, GenerationMode};

/// Argon2id memory-hard parameters (OWASP/RFC 9106 compliant): 64 MiB, 3 iterations, 1 lane.
pub const VAULT_ARGON2_MEMORY_KIB: u32 = 65_536;
pub const VAULT_ARGON2_TIME_COST: u32 = 3;
pub const VAULT_ARGON2_PARALLELISM: u32 = 1;
pub const VAULT_ARGON2_OUTPUT_LEN: usize = 64;
pub const VAULT_KDF_SPEC: &str = "Argon2id v19 • 64 MiB • t=3 • p=1";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultConfig {
    pub master_password: String,
    pub site: String,
    #[serde(default)]
    pub login: String,
    #[serde(default = "default_counter")]
    pub counter: u32,
    pub length: usize,
    pub uppercase: bool,
    pub lowercase: bool,
    pub numbers: bool,
    pub safe_symbols: bool,
    pub extended_symbols: bool,
    pub exclude_ambiguous: bool,
    #[serde(default)]
    pub custom_exclude: String,
}

fn default_counter() -> u32 {
    1
}

impl Default for VaultConfig {
    fn default() -> Self {
        Self {
            master_password: String::new(),
            site: String::new(),
            login: String::new(),
            counter: 1,
            length: 20,
            uppercase: true,
            lowercase: true,
            numbers: true,
            safe_symbols: true,
            extended_symbols: false,
            exclude_ambiguous: true,
            custom_exclude: String::new(),
        }
    }
}

/// Visual fingerprint for master password typo verification (never reveals or stores the password).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MasterFingerprint {
    /// 4-character uppercase hex verification tag (e.g. "A7F3").
    pub code: String,
    /// 3 deterministic icon indices in `0..16` for instant visual confirmation.
    pub symbol_indices: [u8; 3],
    /// Deterministic color hue in degrees `0..360`.
    pub hue_deg: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultResult {
    pub item: GeneratedItem,
    pub effective_alphabet_size: usize,
    pub analysis: SecurityAnalysis,
    pub kdf_spec: String,
    pub master_fingerprint: MasterFingerprint,
}

/// Deterministic SHA-256 counter-mode DRBG seeded from the 64-byte Argon2id output.
/// Implements [`Csprng`] so the vault reuses exact unbiased rejection sampling and Fisher-Yates.
struct DeterministicDrbg {
    seed: [u8; VAULT_ARGON2_OUTPUT_LEN],
    counter: u64,
    buffer: [u8; 32],
    offset: usize,
}

impl DeterministicDrbg {
    fn new(seed: [u8; VAULT_ARGON2_OUTPUT_LEN]) -> Self {
        Self {
            seed,
            counter: 0,
            buffer: [0u8; 32],
            offset: 32,
        }
    }

    fn refill(&mut self) {
        let mut hasher = Sha256::new();
        hasher.update(b"CipherGenX-StatelessVault-DRBG-v1\0");
        hasher.update(self.seed);
        hasher.update(self.counter.to_be_bytes());
        let digest = hasher.finalize();
        self.buffer.copy_from_slice(&digest);
        self.counter = self.counter.wrapping_add(1);
        self.offset = 0;
    }
}

impl Drop for DeterministicDrbg {
    fn drop(&mut self) {
        self.seed.zeroize();
        self.buffer.zeroize();
        self.counter = 0;
        self.offset = 0;
    }
}

impl Csprng for DeterministicDrbg {
    fn fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), CipherError> {
        let mut written = 0;
        while written < dest.len() {
            if self.offset >= self.buffer.len() {
                self.refill();
            }
            let avail = self.buffer.len() - self.offset;
            let take = avail.min(dest.len() - written);
            dest[written..written + take]
                .copy_from_slice(&self.buffer[self.offset..self.offset + take]);
            self.offset += take;
            written += take;
        }
        Ok(())
    }
}

/// Compute a fast, domain-separated visual fingerprint of the master password so the user
/// immediately notices typos before deriving or pasting a password.
pub fn compute_master_fingerprint(master_password: &str) -> MasterFingerprint {
    let mut hasher = Sha256::new();
    hasher.update(b"CipherGenX-MasterFingerprint-v1\0");
    hasher.update(master_password.as_bytes());
    let mut digest = hasher.finalize();

    let code = encode_hex(&digest[0..2], true);
    let symbol_indices = [digest[2] & 0x0F, digest[3] & 0x0F, digest[4] & 0x0F];
    let hue_raw = u16::from_be_bytes([digest[5], digest[6]]);
    let hue_deg = hue_raw % 360;

    digest.as_mut_slice().zeroize();

    MasterFingerprint {
        code,
        symbol_indices,
        hue_deg,
    }
}

fn build_canonical_salt(config: &VaultConfig) -> [u8; 32] {
    let site = config.site.trim().to_lowercase();
    let login = config.login.trim();

    let mut hasher = Sha256::new();
    hasher.update(b"CipherGenX-StatelessVault-Salt-v1\0");

    // Length-prefixed canonical encoding prevents concatenation ambiguity.
    hasher.update((site.len() as u32).to_be_bytes());
    hasher.update(site.as_bytes());
    hasher.update(b"\0");

    hasher.update((login.len() as u32).to_be_bytes());
    hasher.update(login.as_bytes());
    hasher.update(b"\0");

    hasher.update(config.counter.to_be_bytes());
    hasher.update(b"\0");

    // Bind output policy so changing rules generates a fresh independent derivation.
    hasher.update((config.length as u32).to_be_bytes());
    let flags: u8 = (u8::from(config.uppercase))
        | (u8::from(config.lowercase) << 1)
        | (u8::from(config.numbers) << 2)
        | (u8::from(config.safe_symbols) << 3)
        | (u8::from(config.extended_symbols) << 4)
        | (u8::from(config.exclude_ambiguous) << 5);
    hasher.update([flags]);
    hasher.update((config.custom_exclude.len() as u32).to_be_bytes());
    hasher.update(config.custom_exclude.as_bytes());

    let digest = hasher.finalize();
    let mut salt = [0u8; 32];
    salt.copy_from_slice(&digest);
    salt
}

/// Deterministically derive a high-entropy password using Argon2id (64 MiB, t=3, p=1)
/// with custom Argon2 parameters exposed internally for fast unit testing.
pub fn derive_vault_password_with_params(
    config: &VaultConfig,
    m_cost_kib: u32,
    t_cost: u32,
    p_cost: u32,
) -> Result<VaultResult, CipherError> {
    if config.master_password.is_empty() {
        return Err(CipherError::InvalidConfig(
            "Ingresa tu contraseña maestra para derivar la clave.".to_string(),
        ));
    }
    if config.site.trim().is_empty() {
        return Err(CipherError::InvalidConfig(
            "Ingresa el nombre del sitio o servicio (ej. github.com).".to_string(),
        ));
    }
    if config.counter == 0 || config.counter > 999_999 {
        return Err(CipherError::InvalidConfig(
            "El contador de versión debe estar entre 1 y 999,999.".to_string(),
        ));
    }

    let pw_cfg = PasswordConfig {
        length: config.length,
        uppercase: config.uppercase,
        lowercase: config.lowercase,
        numbers: config.numbers,
        safe_symbols: config.safe_symbols,
        extended_symbols: config.extended_symbols,
        exclude_ambiguous: config.exclude_ambiguous,
        custom_exclude: config.custom_exclude.clone(),
        count: 1,
    };

    // Validate password policy BEFORE spending Argon2id CPU/RAM time.
    crate::password::build_active_sets(&pw_cfg)?;

    let master_fingerprint = compute_master_fingerprint(&config.master_password);
    let mut salt = build_canonical_salt(config);

    let params = Params::new(m_cost_kib, t_cost, p_cost, Some(VAULT_ARGON2_OUTPUT_LEN))
        .map_err(|e| CipherError::Internal(format!("Parámetros Argon2id inválidos: {e}")))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut derived_key = [0u8; VAULT_ARGON2_OUTPUT_LEN];
    argon2
        .hash_password_into(config.master_password.as_bytes(), &salt, &mut derived_key)
        .map_err(|e| CipherError::Internal(format!("Error ejecutando Argon2id: {e}")))?;

    salt.zeroize();

    let mut drbg = DeterministicDrbg::new(derived_key);
    derived_key.zeroize();

    let batch = generate_passwords(&mut drbg, &pw_cfg)?;
    drop(drbg);

    let mut item = batch
        .items
        .into_iter()
        .next()
        .ok_or_else(|| CipherError::Internal("No se pudo derivar la contraseña.".to_string()))?;
    item.mode = GenerationMode::VaultDerived;

    let mut analysis = batch.analysis;
    analysis.recommendations.push(
        "Derivada con Argon2id stateless: jamás se guarda en disco. Usa el mismo sitio, usuario y contador en cualquier dispositivo para regenerarla."
            .to_string(),
    );

    Ok(VaultResult {
        item,
        effective_alphabet_size: batch.effective_alphabet_size,
        analysis,
        kdf_spec: VAULT_KDF_SPEC.to_string(),
        master_fingerprint,
    })
}

/// Deterministically derive a password using production OWASP/RFC 9106 Argon2id parameters
/// (64 MiB, 3 iterations, 1 lane).
pub fn derive_vault_password(config: &VaultConfig) -> Result<VaultResult, CipherError> {
    derive_vault_password_with_params(
        config,
        VAULT_ARGON2_MEMORY_KIB,
        VAULT_ARGON2_TIME_COST,
        VAULT_ARGON2_PARALLELISM,
    )
}
