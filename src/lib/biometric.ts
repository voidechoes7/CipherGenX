import { isTauriRuntime } from "./clipboard";

const BIOMETRIC_PREF_KEY = "ciphergen_biometric_lock_v1";

export interface BiometricAvailability {
  available: boolean;
  label: string;
}

export function getBiometricLockEnabled(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(BIOMETRIC_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBiometricLockEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(BIOMETRIC_PREF_KEY, enabled ? "1" : "0");
    }
  } catch {
    // Ignore storage errors in restricted webviews
  }
}

/**
 * Query OS biometric hardware availability (Android BiometricPrompt / iOS Face ID & Touch ID).
 * Safely returns `{ available: false }` on desktop or browser environments.
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (!isTauriRuntime()) {
    return { available: false, label: "No disponible" };
  }

  try {
    const mod = await import("@tauri-apps/plugin-biometric");
    const status = await mod.checkStatus();
    if (!status.isAvailable) {
      return { available: false, label: "No configurado" };
    }

    let label = "Biometría";
    if (status.biometryType === mod.BiometryType.FaceID) {
      label = "Face ID";
    } else if (status.biometryType === mod.BiometryType.TouchID) {
      label = "Touch ID / Huella";
    } else if (status.biometryType === mod.BiometryType.Iris) {
      label = "Reconocimiento Iris";
    }

    return { available: true, label };
  } catch {
    return { available: false, label: "No disponible" };
  }
}

/**
 * Trigger native OS biometric authentication (with device PIN/Passcode fallback).
 */
export async function authenticateWithBiometrics(
  reason = "Desbloquear CipherGenX"
): Promise<{ success: boolean; error?: string }> {
  if (!isTauriRuntime()) {
    return { success: true };
  }

  try {
    const mod = await import("@tauri-apps/plugin-biometric");
    await mod.authenticate(reason, {
      allowDeviceCredential: true,
      title: "CipherGenX",
      subtitle: "Autenticación biométrica offline",
      cancelTitle: "Cancelar",
      fallbackTitle: "Usar código",
    });
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "Autenticación cancelada o fallida.";
    return { success: false, error: message };
  }
}
