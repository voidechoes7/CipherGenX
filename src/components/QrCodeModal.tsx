import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, Eye, EyeOff, QrCode, WifiOff } from "lucide-react";

interface QrCodeModalProps {
  value: string | null;
  label?: string;
  entropyBits?: number;
  onClose: () => void;
  onCopy: (value: string) => void;
}

export function QrCodeModal({
  value,
  label,
  entropyBits,
  onClose,
  onCopy,
}: QrCodeModalProps) {
  const [showPlain, setShowPlain] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShowPlain(false);
    setCopied(false);
  }, [value]);

  useEffect(() => {
    if (!value) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onClose]);

  const qrMatrix = useMemo(() => {
    if (!value) return null;
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
      const size = qr.modules.size;
      const cells: { x: number; y: number }[] = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (qr.modules.get(x, y)) {
            cells.push({ x, y });
          }
        }
      }
      return { size, cells };
    } catch {
      return null;
    }
  }, [value]);

  if (!value) return null;

  const quietZone = 3;
  const viewBoxSize = qrMatrix ? qrMatrix.size + quietZone * 2 : 0;

  const handleCopy = () => {
    onCopy(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Código QR Offline"
      onClick={onClose}
    >
      <div
        className="cyber-panel cyber-accent-ring w-full max-w-sm rounded-3xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-bold tracking-tight">
              Transferencia QR Offline
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal QR"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* High-contrast white frame for reliable mobile camera scanning in all themes */}
        <div className="mx-auto flex w-fit items-center justify-center rounded-2xl bg-white p-3.5 shadow-xl">
          {qrMatrix ? (
            <svg
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
              className="h-56 w-56 sm:h-60 sm:w-60"
              shapeRendering="crispEdges"
              role="img"
              aria-label="Código QR generado offline"
            >
              <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
              {qrMatrix.cells.map((cell) => (
                <rect
                  key={`${cell.x}-${cell.y}`}
                  x={cell.x + quietZone}
                  y={cell.y + quietZone}
                  width={1}
                  height={1}
                  fill="#090b10"
                />
              ))}
            </svg>
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-center text-xs text-slate-700">
              El texto supera la capacidad máxima de un código QR estándar.
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2.5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            {label && (
              <span className="cyber-elevated rounded-full px-2.5 py-0.5 font-medium text-slate-200">
                {label}
              </span>
            )}
            <span>{[...value].length} caracteres</span>
            {typeof entropyBits === "number" && (
              <>
                <span>•</span>
                <span className="font-mono font-semibold text-cyan-300">
                  {entropyBits.toFixed(1)} bits
                </span>
              </>
            )}
          </div>

          <div className="cyber-elevated rounded-xl px-3 py-2">
            <code className="font-mono-secret break-all text-xs text-slate-200">
              {showPlain
                ? value
                : "•".repeat(Math.min([...value].length, 28))}
            </code>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowPlain((v) => !v)}
              className="cyber-elevated inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition hover:text-white"
            >
              {showPlain ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              <span>{showPlain ? "Ocultar" : "Ver texto"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="btn-accent-text inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition hover:brightness-110"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar secreto</span>
                </>
              )}
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-500">
            <WifiOff className="h-3 w-3 text-emerald-400" />
            Generado 100% en local (SVG). Escanea desde otro dispositivo sin pasar por la red.
          </p>
        </div>
      </div>
    </div>
  );
}
