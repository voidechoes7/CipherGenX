import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { ModeTabs } from "./components/ModeTabs";
import { QuickPresets, type SecurityPresetId } from "./components/QuickPresets";
import { PasswordConfigPanel } from "./components/PasswordConfigPanel";
import { PassphraseConfigPanel } from "./components/PassphraseConfigPanel";
import { KeysConfigPanel } from "./components/KeysConfigPanel";
import { OutputList } from "./components/OutputList";
import { SecurityAnalysisPanel } from "./components/SecurityAnalysisPanel";
import { PrivacyFooter } from "./components/PrivacyFooter";
import {
  AutoClearClipboardController,
  createRuntimeClipboardAdapter,
  isTauriRuntime,
  type ClipboardTimerState,
} from "./lib/clipboard";
import {
  analyzeCustomSecret,
  generateKeys,
  generatePassphrases,
  generatePasswords,
  generatePins,
} from "./lib/tauriBridge";
import type {
  ActiveTab,
  ClipboardTtl,
  GeneratedItem,
  KeyConfig,
  KeySubMode,
  PassphraseConfig,
  PasswordConfig,
  PinConfig,
  SecurityAnalysis,
  ThemeId,
} from "./types/ciphergen";

const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  length: 24,
  uppercase: true,
  lowercase: true,
  numbers: true,
  safeSymbols: true,
  extendedSymbols: false,
  excludeAmbiguous: true,
  count: 1,
};

const DEFAULT_PASSPHRASE_CONFIG: PassphraseConfig = {
  wordCount: 6,
  separator: "-",
  capitalization: "title",
  includeNumber: true,
  count: 1,
};

const DEFAULT_PIN_CONFIG: PinConfig = {
  length: 6,
  count: 1,
};

const DEFAULT_KEY_CONFIG: KeyConfig = {
  format: "hex",
  bits: "256",
  uppercase: false,
  grouped: false,
  count: 1,
};

export default function App() {
  const [theme, setTheme] = useState<ThemeId>("obsidian");
  const [activeTab, setActiveTab] = useState<ActiveTab>("password");
  const [keySubMode, setKeySubMode] = useState<KeySubMode>("hex");
  const [batchCount, setBatchCount] = useState<number>(1);
  const [masked, setMasked] = useState<boolean>(false);
  const [clipboardTtl, setClipboardTtl] = useState<ClipboardTtl>(30);

  const [passwordConfig, setPasswordConfig] = useState<PasswordConfig>(
    DEFAULT_PASSWORD_CONFIG
  );
  const [passphraseConfig, setPassphraseConfig] = useState<PassphraseConfig>(
    DEFAULT_PASSPHRASE_CONFIG
  );
  const [pinConfig, setPinConfig] = useState<PinConfig>(DEFAULT_PIN_CONFIG);
  const [keyConfig, setKeyConfig] = useState<KeyConfig>(DEFAULT_KEY_CONFIG);

  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customSecret, setCustomSecret] = useState<string>("");
  const [customAnalysis, setCustomAnalysis] = useState<SecurityAnalysis | null>(
    null
  );

  const [copiedIndex, setCopiedIndex] = useState<number | "all" | null>(null);
  const [timerState, setTimerState] = useState<ClipboardTimerState>({
    remainingSeconds: 0,
    totalSeconds: 30,
    active: false,
  });

  const clipboardRef = useRef<AutoClearClipboardController | null>(null);
  const isNativeRust = isTauriRuntime();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AutoClearClipboardController(
      createRuntimeClipboardAdapter(),
      (state) => setTimerState(state)
    );
    clipboardRef.current = controller;
    return () => controller.dispose();
  }, []);

  const runGeneration = useCallback(async () => {
    try {
      setError(null);
      if (activeTab === "password") {
        const res = await generatePasswords({
          ...passwordConfig,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
      } else if (activeTab === "passphrase") {
        const res = await generatePassphrases({
          ...passphraseConfig,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
      } else if (keySubMode === "pin") {
        const res = await generatePins({
          ...pinConfig,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
      } else {
        const res = await generateKeys({
          ...keyConfig,
          format: keySubMode === "hex" ? "hex" : "base32",
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
      }
      setCopiedIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [
    activeTab,
    batchCount,
    keyConfig,
    keySubMode,
    passphraseConfig,
    passwordConfig,
    pinConfig,
  ]);

  useEffect(() => {
    void runGeneration();
  }, [runGeneration]);

  useEffect(() => {
    if (!customSecret) {
      setCustomAnalysis(null);
      return;
    }
    let cancelled = false;
    void analyzeCustomSecret(customSecret).then((res) => {
      if (!cancelled) setCustomAnalysis(res);
    });
    return () => {
      cancelled = true;
    };
  }, [customSecret]);

  const handleCopyItem = useCallback(
    async (value: string, index: number) => {
      if (!clipboardRef.current) return;
      await clipboardRef.current.copyWithAutoClear(value, clipboardTtl);
      setCopiedIndex(index);
    },
    [clipboardTtl]
  );

  const handleCopyAll = async () => {
    if (!clipboardRef.current || items.length === 0) return;
    const joined = items.map((i) => i.value).join("\n");
    await clipboardRef.current.copyWithAutoClear(joined, clipboardTtl);
    setCopiedIndex("all");
  };

  const handleClearClipboard = useCallback(async () => {
    if (!clipboardRef.current) return;
    await clipboardRef.current.clearNow();
    setCopiedIndex(null);
  }, []);

  const handlePanicWipe = useCallback(async () => {
    setItems([]);
    setCustomSecret("");
    setCustomAnalysis(null);
    await handleClearClipboard();
  }, [handleClearClipboard]);

  const handlePreset = (preset: SecurityPresetId) => {
    if (preset === "daily") {
      setActiveTab("password");
      setPasswordConfig({
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        safeSymbols: true,
        extendedSymbols: false,
        excludeAmbiguous: true,
        count: batchCount,
      });
    } else if (preset === "masterVault") {
      setActiveTab("passphrase");
      setPassphraseConfig({
        wordCount: 7,
        separator: "-",
        capitalization: "title",
        includeNumber: true,
        count: batchCount,
      });
    } else if (preset === "postQuantum") {
      setActiveTab("password");
      setPasswordConfig({
        length: 44,
        uppercase: true,
        lowercase: true,
        numbers: true,
        safeSymbols: true,
        extendedSymbols: true,
        excludeAmbiguous: false,
        count: batchCount,
      });
    } else if (preset === "apiBase32") {
      setActiveTab("keys");
      setKeySubMode("base32");
      setKeyConfig({
        format: "base32",
        bits: "256",
        uppercase: true,
        grouped: true,
        count: batchCount,
      });
    }
  };

  // Keyboard shortcuts: Ctrl/Cmd+G regenerate, Ctrl/Cmd+Shift+C copy first, Esc panic wipe
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        void runGeneration();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "c" &&
        items.length > 0
      ) {
        e.preventDefault();
        void handleCopyItem(items[0].value, 0);
      } else if (e.key === "Escape" && !isEditable) {
        e.preventDefault();
        void handlePanicWipe();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCopyItem, handlePanicWipe, items, runGeneration]);

  return (
    <div className="cyber-bg safe-area-pad min-h-screen w-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <Header
          theme={theme}
          onThemeChange={setTheme}
          isNativeRust={isNativeRust}
          onPanicWipe={handlePanicWipe}
        />

        <div className="space-y-3">
          <ModeTabs activeTab={activeTab} onChange={setActiveTab} />
          <QuickPresets onSelect={handlePreset} />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <OutputList
          items={items}
          batchCount={batchCount}
          onBatchCountChange={setBatchCount}
          masked={masked}
          onToggleMask={() => setMasked((m) => !m)}
          clipboardTtl={clipboardTtl}
          onClipboardTtlChange={setClipboardTtl}
          timerState={timerState}
          copiedIndex={copiedIndex}
          onCopyItem={handleCopyItem}
          onCopyAll={handleCopyAll}
          onClearClipboard={handleClearClipboard}
          onRegenerate={runGeneration}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="cyber-panel rounded-2xl p-4 sm:p-5 lg:col-span-6">
            <h2 className="mb-4 text-sm font-bold tracking-tight text-slate-200">
              {activeTab === "password"
                ? "Parámetros de Contraseña"
                : activeTab === "passphrase"
                ? "Parámetros de Frase Diceware"
                : "Parámetros de PIN y Llaves"}
            </h2>

            {activeTab === "password" && (
              <PasswordConfigPanel
                config={passwordConfig}
                onChange={setPasswordConfig}
              />
            )}

            {activeTab === "passphrase" && (
              <PassphraseConfigPanel
                config={passphraseConfig}
                onChange={setPassphraseConfig}
              />
            )}

            {activeTab === "keys" && (
              <KeysConfigPanel
                subMode={keySubMode}
                onSubModeChange={setKeySubMode}
                pinConfig={pinConfig}
                onPinChange={setPinConfig}
                keyConfig={keyConfig}
                onKeyChange={setKeyConfig}
              />
            )}
          </section>

          <div className="lg:col-span-6">
            {analysis && (
              <SecurityAnalysisPanel
                analysis={analysis}
                customSecret={customSecret}
                onCustomSecretChange={setCustomSecret}
                customAnalysis={customAnalysis}
              />
            )}
          </div>
        </div>

        <PrivacyFooter />
      </div>
    </div>
  );
}
