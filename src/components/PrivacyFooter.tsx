import { Lock, HardDrive, ShieldAlert, Keyboard } from "lucide-react";

export function PrivacyFooter() {
  return (
    <footer className="mt-2 flex flex-col gap-2 border-t border-slate-800/80 pt-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-emerald-500" />
          CSP estricta (connect-src &apos;none&apos;)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-cyan-500" />
          Historial solo en RAM volátil
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          Argon2id stateless + CSPRNG sin sesgo
        </span>
        <span className="hidden items-center gap-1.5 lg:inline-flex">
          <Keyboard className="h-3.5 w-3.5 text-slate-400" />
          Ctrl+G Regenerar • Ctrl+Shift+C Copiar • Esc Limpiar RAM
        </span>
      </div>
      <div className="text-slate-500">
        © 2026 CipherGenX v1.1.0 — Private Personal Use
      </div>
    </footer>
  );
}
