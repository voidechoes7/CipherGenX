import { useState } from "react";
import { Radio, Copy, Check } from "lucide-react";
import { formatNatoPlaintext, spellNato, type NatoCategory } from "../lib/nato";

interface NatoSpellingViewProps {
  value: string;
  onCopyNato?: (text: string) => void;
}

const CATEGORY_STYLE: Record<
  NatoCategory,
  { chip: string; char: string; tag: string }
> = {
  upper: {
    chip: "border-purple-500/30 bg-purple-500/10",
    char: "text-purple-300",
    tag: "MAYÚS",
  },
  lower: {
    chip: "border-slate-700/70 bg-slate-900/60",
    char: "text-slate-100",
    tag: "minús",
  },
  digit: {
    chip: "border-cyan-500/35 bg-cyan-500/10",
    char: "text-cyan-300",
    tag: "NÚM",
  },
  symbol: {
    chip: "border-amber-500/35 bg-amber-500/10",
    char: "text-amber-300",
    tag: "SÍMB",
  },
  space: {
    chip: "border-emerald-500/30 bg-emerald-500/10",
    char: "text-emerald-300",
    tag: "ESP",
  },
};

export function NatoSpellingView({ value, onCopyNato }: NatoSpellingViewProps) {
  const [copied, setCopied] = useState(false);
  const tokens = spellNato(value);

  const handleCopy = () => {
    const text = formatNatoPlaintext(value);
    if (onCopyNato) {
      onCopyNato(text);
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
          <Radio className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span>Deletreo Fonético NATO ({tokens.length} caracteres)</span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="cyber-elevated inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-300">Deletreo copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copiar deletreo</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tokens.map((t) => {
          const st = CATEGORY_STYLE[t.category];
          return (
            <div
              key={t.index}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${st.chip}`}
            >
              <span className="font-mono text-[9px] text-slate-500">
                {t.index}
              </span>
              <span className={`font-mono-secret text-xs font-bold ${st.char}`}>
                {t.char}
              </span>
              <span className="font-medium text-slate-200">{t.word}</span>
              {(t.category === "upper" || t.category === "lower") && (
                <span className="rounded bg-white/10 px-1 text-[9px] font-semibold text-slate-400">
                  {st.tag}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
