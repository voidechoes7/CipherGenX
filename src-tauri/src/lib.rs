#![forbid(unsafe_code)]

use ciphergen_core::{
    analyze_custom_secret, generate_keys, generate_passphrases, generate_passwords, generate_pins,
    KeyBatchResult, KeyConfig, PassphraseBatchResult, PassphraseConfig, PasswordBatchResult,
    PasswordConfig, PinConfig, SecurityAnalysis, SystemCsprng,
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
fn analyze_secret_cmd(secret: String) -> SecurityAnalysis {
    analyze_custom_secret(&secret)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            generate_passwords_cmd,
            generate_passphrases_cmd,
            generate_pins_cmd,
            generate_keys_cmd,
            analyze_secret_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CipherGen application");
}
