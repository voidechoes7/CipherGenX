#![forbid(unsafe_code)]

use ciphergen_core::{
    analyze_custom_secret, compute_master_fingerprint, derive_vault_password, generate_bip39,
    generate_keys, generate_passphrases, generate_passwords, generate_pins,
    generate_recovery_codes, generate_uuids, Bip39Config, KeyBatchResult, KeyConfig,
    MasterFingerprint, PassphraseBatchResult, PassphraseConfig, PasswordBatchResult,
    PasswordConfig, PinConfig, RecoveryCodeConfig, SecurityAnalysis, SystemCsprng, UuidConfig,
    VaultConfig, VaultResult,
};

#[tauri::command]
fn generate_passwords_cmd(config: PasswordConfig) -> Result<PasswordBatchResult, String> {
    let mut rng = SystemCsprng::new();
    generate_passwords(&mut rng, &config).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_passphrases_cmd(config: PassphraseConfig) -> Result<PassphraseBatchResult, String> {
    let mut rng = SystemCsprng::new();
    generate_passphrases(&mut rng, &config).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_pins_cmd(config: PinConfig) -> Result<KeyBatchResult, String> {
    let mut rng = SystemCsprng::new();
    generate_pins(&mut rng, &config).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_keys_cmd(config: KeyConfig) -> Result<KeyBatchResult, String> {
    let mut rng = SystemCsprng::new();
    generate_keys(&mut rng, &config).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_uuids_cmd(config: UuidConfig) -> Result<KeyBatchResult, String> {
    let mut rng = SystemCsprng::new();
    generate_uuids(&mut rng, &config).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_bip39_cmd(config: Bip39Config) -> Result<KeyBatchResult, String> {
    let mut rng = SystemCsprng::new();
    generate_bip39(&mut rng, &config).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_recovery_codes_cmd(config: RecoveryCodeConfig) -> Result<KeyBatchResult, String> {
    let mut rng = SystemCsprng::new();
    generate_recovery_codes(&mut rng, &config).map_err(|e| e.to_string())
}

#[tauri::command]
async fn derive_vault_password_cmd(config: VaultConfig) -> Result<VaultResult, String> {
    // Run memory-hard Argon2id derivation on a blocking worker thread so the UI stays 60fps responsive.
    tauri::async_runtime::spawn_blocking(move || {
        derive_vault_password(&config).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Error de hilo interno: {e}"))?
}

#[tauri::command]
fn compute_master_fingerprint_cmd(master_password: String) -> MasterFingerprint {
    compute_master_fingerprint(&master_password)
}

#[tauri::command]
fn analyze_secret_cmd(secret: String) -> SecurityAnalysis {
    analyze_custom_secret(&secret)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_clipboard_manager::init());

    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_biometric::init());

    builder
        .invoke_handler(tauri::generate_handler![
            generate_passwords_cmd,
            generate_passphrases_cmd,
            generate_pins_cmd,
            generate_keys_cmd,
            generate_uuids_cmd,
            generate_bip39_cmd,
            generate_recovery_codes_cmd,
            derive_vault_password_cmd,
            compute_master_fingerprint_cmd,
            analyze_secret_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CipherGen application");
}
