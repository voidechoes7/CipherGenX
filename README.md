# CipherGen (`CipherGenX`) v1.1.2

Suite criptográfica independiente, **100% offline**, ultra segura y sin telemetría construida con **Rust puro (`#![forbid(unsafe_code)]`)** y **Tauri 2** para **Windows (`.exe`)**, **Android (`.apk`)**, **iOS (`.ipa` sin firmar)** y **Linux (`.deb` / `.AppImage`)**.

---

## Descargas Directas — Release `v1.1.2`

| Plataforma | Archivo | Descarga Directa |
| --- | --- | --- |
| **Android** | Universal APK firmado (`.apk`) | [CipherGen_1.1.2_Android_universal-signed.apk](https://github.com/voidechoes7/CipherGenX/releases/download/v1.1.2/CipherGen_1.1.2_Android_universal-signed.apk) |
| **iOS** | IPA sin firmar para AltStore / Sideloadly / Xcode (`.ipa`) | [CipherGen_1.1.2_iOS-unsigned.ipa](https://github.com/voidechoes7/CipherGenX/releases/download/v1.1.2/CipherGen_1.1.2_iOS-unsigned.ipa) |
| **Windows (x64)** | Instalador NSIS (`.exe`) | [CipherGen_1.1.2_x64-setup.exe](https://github.com/voidechoes7/CipherGenX/releases/download/v1.1.2/CipherGen_1.1.2_x64-setup.exe) |
| **Linux (Debian/Ubuntu)** | Paquete `.deb` | [CipherGen_1.1.2_amd64.deb](https://github.com/voidechoes7/CipherGenX/releases/download/v1.1.2/CipherGen_1.1.2_amd64.deb) |
| **Linux (Universal)** | Portable `.AppImage` | [CipherGen_1.1.2_amd64.AppImage](https://github.com/voidechoes7/CipherGenX/releases/download/v1.1.2/CipherGen_1.1.2_amd64.AppImage) |
| **Verificación** | Sumas SHA-256 | [SHA256SUMS.txt](https://github.com/voidechoes7/CipherGenX/releases/download/v1.1.2/SHA256SUMS.txt) |

---

## Novedades Principales en v1.1.2

1. **Bóveda Determinista Argon2id (Stateless)**:
   - Derivación determinista con **Argon2id v19 (`64 MiB`, `t=3`, `p=1`)** + DRBG SHA-256 sin sesgo.
   - Regenera exactamente la misma contraseña única en Windows, Linux, Android e iOS sin guardar ninguna base de datos en disco.
   - Incluye **Huella Visual Anti-Errores (Master Fingerprint)** para detectar instantáneamente errores de tipeo en la contraseña maestra, y **contador de versión (`v1`, `v2`, ...)** para rotación inmediata.
2. **Transferencia por Código QR 100% Offline**:
   - Generación SVG instantánea en local con marco de alto contraste, texto ocultable y cero dependencias de red.
3. **Deletreo Fonético NATO**:
   - Desglose carácter por carácter con códigos de color (`MAYÚS`, `minús`, `NÚM`, `SÍMB`) y copia de deletreo en 1 clic para dictado o transcripción en dispositivos aislados.
4. **Diceware Bilingüe ES / EN**:
   - **Español (8,192 palabras ASCII limpias • `13.0` bits exactos/palabra)** y **English EFF Large Wordlist (7,776 palabras • `12.92` bits/palabra)** embebidos 100% offline.
5. **BIP-39 / Base64URL / UUID v4 / Códigos de Recuperación 2FA**:
   - **Semillas BIP-39** (12 / 15 / 18 / 21 / 24 palabras en **EN** y **ES**) con suma de verificación **SHA-256** exacta y visualización numerada.
   - **Tokens Base64URL** (RFC 4648 §5, 128–512 bits, sin relleno `=`) para JWT, OAuth PKCE y APIs.
   - **UUID v4** (RFC 9562, 122 bits CSPRNG) con/sin guiones y mayúsculas opcionales.
   - **Códigos de recuperación 2FA** (`4×2`, `5×2`, `4×4`, kit de 8 códigos) con alfabeto sin caracteres ambiguos (`0`, `O`, `1`, `I`, `L`).
6. **Exclusión Personalizada de Caracteres**:
   - Campo libre + filtros rápidos de 1 clic (`Comillas "'`, `Barras /\`, `HTML <>&`, `Shell $;|`) disponible tanto en el generador principal como en la Bóveda Argon2id.
7. **Historial Efímero en RAM**:
   - Últimos 20 secretos de la sesión únicamente en memoria volátil (enmascarados por defecto, con revelar/copiar/QR/NATO, pausable y destruido automáticamente al cerrar, bloquear o pulsar `Esc`).
8. **Auto-Bloqueo al Minimizar**:
   - Limpia secretos en pantalla, historial RAM, bóveda y portapapeles al minimizar o cambiar de aplicación (`Inmediato 0s`, `15s`, `30s`, `60s` o `OFF`).
9. **Analizador con Entropía Real Penalizada**:
   - Compara entropía teórica vs. **entropía real penalizada**, detectando diccionarios ES/EN (con leetspeak), patrones de teclado QWERTY, secuencias alfanuméricas, fechas/años, repeticiones, baja entropía de Shannon y reglas humanas (`Palabra + 2025 + !`).

---

## Arquitectura y Garantías de Seguridad

- **`#![forbid(unsafe_code)]`** en todo el núcleo (`crates/ciphergen-core`) y el shell Tauri (`src-tauri`).
- **CSPRNG exclusivo del sistema operativo** (`rand_core::OsRng` / `getrandom`: `BCryptGenRandom`, `getrandom(2)`, `SecRandomCopyBytes`).
- **Muestreo por rechazo sin sesgo módulo** (`arc4random_uniform` sobre `u64`) + mezcla **Fisher-Yates**.
- **Limpieza de memoria (`zeroize`)** sobre claves derivadas, buffers binarios y estado DRBG.
- **CSP estricta** (`connect-src 'none'`), cero telemetría, cero historial persistente en disco, 6 temas (4 oscuros + 2 claros) y bloqueo biométrico nativo en Android/iOS.

---

## Desarrollo Local y Pruebas

```bash
# Pruebas unitarias en Rust (Argon2id, BIP-39 vectores oficiales, Chi-cuadrado, Diceware ES/EN, entropía penalizada)
cargo test -p ciphergen-core

# Pruebas unitarias en Vitest
npm ci
npm test

# Compilación de verificación del frontend
npm run build
```

---

## Licencia

Licencia propietaria: **All Rights Reserved — Private Personal Use**. Consulta el archivo [`LICENSE`](LICENSE) para más detalles.
