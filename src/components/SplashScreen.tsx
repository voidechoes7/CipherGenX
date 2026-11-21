import { useEffect, useState } from "react";
import { Fingerprint, ArrowRight, WifiOff, ShieldCheck, Lock } from "lucide-react";

interface SplashScreenProps {
  biometricAvailable: boolean;
  biometricLabel: string;
  biometricLockEnabled: boolean;
  onUnlockBiometric: () => Promise<{ success: boolean; error?: string }>;
  onEnter: () => void;
  onToggleBiometricLock: (enabled: boolean) => void;
}

export function SplashScreen({
  biometricAvailable,
  biometricLabel,
  biometricLockEnabled,
  onUnlockBiometric,
  onEnter,
  onToggleBiometricLock,
}: SplashScreenProps) {
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const requireBiometric = biometricAvailable && biometricLockEnabled;

  const triggerBiometric = async () => {
    setAuthenticating(true);
    setAuthError(null);
    const res = await onUnlockBiometric();
    setAuthenticating(false);
    if (res.success) {
      onEnter();
    } else if (res.error) {
      setAuthError(res.error);
    }
  };

  useEffect(() => {
    if (requireBiometric) {
      void triggerBiometric();
    }
    // Only auto-prompt once when splash mounts in locked state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireBiometric]);

  return (
    <div className="cyber-bg safe-area-pad flex min-h-screen w-full flex-col items-center justify-center px-5 py-10">
      <div className="cyber-panel cyber-accent-ring flex w-full max-w-md flex-col items-center rounded-3xl p-7 text-center sm:p-9">
        {/* Centered Neon Cyber Shield emblem */}
        <div
          className="shield-halo relative mb-6 h-32 w-32 overflow-hidden rounded-3xl border-2 sm:h-36 sm:w-36"
          style={{ borderColor: "var(--border-accent)" }}
        >
          <img
            src="/logo.png"
            alt="CipherGenX Shield Logo"
            className="h-full w-full object-cover"
          />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Cipher<span style={{ color: "var(--accent)" }}>GenX</span>
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
          Generador criptográfico CSPRNG y analizador de entropía post-cuántica.
          100% offline y sin rastros en disco.
        </p>

        {/* Security badges */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-300">
          <span className="cyber-elevated inline-flex items-center gap-1 rounded-full px-2.5 py-1">
            <WifiOff className="h-3 w-3 text-emerald-400" />
            Offline
          </span>
          <span className="cyber-elevated inline-flex items-center gap-1 rounded-full px-2.5 py-1">
            <ShieldCheck className="h-3 w-3" style={{ color: "var(--accent)" }} />
            Rust CSPRNG
          </span>
          <span className="cyber-elevated inline-flex items-center gap-1 rounded-full px-2.5 py-1">
            <Lock className="h-3 w-3 text-amber-400" />
            Sin Historial
          </span>
        </div>

        {authError && (
          <div className="mt-4 w-full rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
            {authError}
          </div>
        )}

        {/* Primary CTA */}
        <div className="mt-7 w-full space-y-3">
          {requireBiometric ? (
            <button
              type="button"
              disabled={authenticating}
              onClick={triggerBiometric}
              className="btn-accent-text flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Fingerprint className="h-5 w-5" />
              <span>
                {authenticating
                  ? "Verificando biometría..."
                  : `Desbloquear con ${biometricLabel}`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEnter}
              className="btn-accent-text flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <span>Entrar a CipherGenX</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {biometricAvailable && !requireBiometric && (
            <button
              type="button"
              onClick={() => onToggleBiometricLock(true)}
              className="cyber-elevated flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
            >
              <Fingerprint className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <span>Activar bloqueo con {biometricLabel}</span>
            </button>
          )}
        </div>

        <p className="mt-6 text-[10px] text-slate-500">
          v1.0.1 • All Rights Reserved — Private Personal Use
        </p>
      </div>
    </div>
  );
}
