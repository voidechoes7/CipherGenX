# CipherGen (`CipherGenX`)

Aplicación independiente, **100% offline**, ultra segura y sin telemetría de Generación de Contraseñas, Frases de Paso Diceware EFF, PINs y Llaves Criptográficas (Hex/Base32), construida con **Rust puro (`#![forbid(unsafe_code)]`)** y **Tauri 2** para **Windows (`.exe`)**, **Android (`.apk`)**, **iOS (`.ipa` sin firmar)** y **Linux (`.deb` / `.AppImage`)**.

---

## Arquitectura y Garantías de Seguridad

### 1. Núcleo Criptográfico en Rust Puro (`crates/ciphergen-core`)
- **`#![forbid(unsafe_code)]`** en todo el núcleo (`ciphergen-core`) y el shell Tauri (`src-tauri`).
- **CSPRNG exclusivo del sistema operativo** (`rand_core::OsRng` / `getrandom`):
  - Windows: `BCryptGenRandom`
  - Linux / Android: `getrandom(2)`
  - iOS / macOS: `SecRandomCopyBytes`
- **Muestreo por rechazo sin sesgo módulo (`%`)**:
  Implementación exacta del algoritmo `arc4random_uniform` sobre `u64`:
  `threshold = bound.wrapping_neg() % bound`; se descartan todas las muestras `< threshold` antes de reducir módulo `bound`, eliminando por completo cualquier sesgo estadístico.
- **Limpieza de memoria (`zeroize`)**: los buffers binarios e intermedios sensibles se sobrescriben con ceros inmediatamente después de su codificación.

### 2. Modos de Generación
- **Contraseñas aleatorias de alta entropía**:
  - Longitud `8–128` caracteres.
  - Toggles independientes: mayúsculas, minúsculas, números, símbolos seguros (`!@#$%^&*-_=+?`), símbolos extendidos y exclusión de caracteres ambiguos (`0O1lI|`).
  - Garantía de al menos **1 carácter de cada conjunto activo** + mezcla **Fisher-Yates** usando el CSPRNG por rechazo.
- **Frases de paso Diceware EFF**:
  - Lista oficial **EFF Large Wordlist (7,776 palabras)** embebida localmente offline (`include_str!`).
  - `4–12` palabras, separador personalizable, capitalización (`Título`, `minúsculas`, `MAYÚSCULAS`, `1 palabra aleatoria`) y dígito aleatorio opcional.
- **PINs y Llaves Criptográficas**:
  - PINs numéricos criptográficamente uniformes (`4–16` dígitos).
  - Llaves **Hex** y **Base32 (RFC 4648)** exactas de **128 bits** y **256 bits** con agrupación opcional de 4 caracteres.

### 3. Análisis Criptográfico Local en Tiempo Real
- Entropía exacta en bits según el alfabeto efectivo.
- Estimación de tiempo medio de descifrado ($2^{H-1}$ intentos):
  - **Ataque online con rate-limit** (`100 intentos/hora`).
  - **Clúster moderno de GPUs en hash rápido** (`100 GH/s` — SHA-256 / NTLM).
  - **Clúster moderno de GPUs contra Argon2id** (`10 kH/s` — KDF memory-hard).
- **Análisis honesto frente al Algoritmo de Grover cuántico**: divide la entropía efectiva a la mitad ($H / 2$) e indica claramente cuándo se alcanza el umbral **Post-Cuántico ($\ge 256$ bits clásicos / $\ge 128$ bits efectivos)**.

### 4. Higiene de Privacidad
- **CSP estricta** (`connect-src 'none'`, cero fuentes o scripts externos, cero telemetría).
- **Cero historial persistente en disco**: todo vive únicamente en RAM volátil.
- **Auto-limpieza de portapapeles** configurable (`15s` / `30s` / `60s`) con barra de cuenta regresiva y limpieza inmediata manual.
- **Generación por lote** (`1` a `10` elementos) y 4 temas oscuros estilo **Obsidian / Neon Cyber**.

---

## Desarrollo Local y Pruebas

### Requisitos
- Rust stable (`rustc` + `cargo`)
- Node.js 22+ (`npm`)
- Dependencias de plataforma de Tauri 2 para compilar ejecutables nativos.

### Ejecutar pruebas
```bash
# Pruebas unitarias en Rust (sesgo Chi-cuadrado, Fisher-Yates, entropía, EFF 7776, políticas)
cargo test -p ciphergen-core

# Pruebas unitarias en Vitest (entropía, Grover, auto-limpieza de portapapeles, políticas)
npm ci
npm test

# Compilación de verificación del frontend
npm run build
```

### Ejecutar en modo desarrollo (Tauri Desktop)
```bash
npm run tauri dev
```

---

## CI/CD Multiplataforma (GitHub Actions)

El workflow [`.github/workflows/build-release.yml`](.github/workflows/build-release.yml) ejecuta automáticamente las pruebas en Rust y Vitest y genera los artefactos descargables:
- **Windows**: instalador NSIS (`.exe`)
- **Linux**: paquetes `.deb` y `.AppImage`
- **Android**: paquete `.apk`
- **iOS**: paquete `.ipa` sin firmar (para firma personal con AltStore / Sideloadly / Xcode)

Al crear un tag `v*` (por ejemplo `v1.0.0`), todos los binarios se publican automáticamente en GitHub Releases.

---

## Licencia

Licencia propietaria: **All Rights Reserved — Private Personal Use**. Consulta el archivo [`LICENSE`](LICENSE) para más detalles.
