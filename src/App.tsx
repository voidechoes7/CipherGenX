import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { ModeTabs } from "./components/ModeTabs";
import { QuickPresets, type SecurityPresetId } from "./components/QuickPresets";
import { PasswordConfigPanel } from "./components/PasswordConfigPanel";
import { PassphraseConfigPanel } from "./components/PassphraseConfigPanel";
import { KeysConfigPanel } from "./components/KeysConfigPanel";
import { OutputList } from "./components/OutputList";
import { SecurityAnalysisPanel } from "./components/SecurityAnalysisPanel";
import { ManualAnalyzerPanel } from "./components/ManualAnalyzerPanel";
import { VaultPanel } from "./components/VaultPanel";
import { RamHistoryDrawer } from "./components/RamHistoryDrawer";
import { QrCodeModal } from "./components/QrCodeModal";
import { SplashScreen } from "./components/SplashScreen";
import { PrivacyFooter } from "./components/PrivacyFooter";
import {
  AutoClearClipboardController,
  createRuntimeClipboardAdapter,
  isTauriRuntime,
  type ClipboardTimerState,
} from "./lib/clipboard";
import {
  authenticateWithBiometrics,
  checkBiometricAvailability,
  getBiometricLockEnabled,
  setBiometricLockEnabled,
} from "./lib/biometric";
import {
  autoLockDelayMs,
  getAutoLockMode,
  setAutoLockMode,
} from "./lib/autolock";
import { appendRamHistory } from "./lib/ramHistory";
import { isLightTheme } from "./lib/themes";
import {
  analyzeCustomSecret,
  generateBip39,
  generateKeys,
  generatePassphrases,
  generatePasswords,
  generatePins,
  generateRecoveryCodes,
  generateUuids,
} from "./lib/tauriBridge";
import type {
  ActiveTab,
  AutoLockMode,
  Bip39Config,
  ClipboardTtl,
  GeneratedItem,
  KeyConfig,
  KeySubMode,
  PassphraseConfig,
  PasswordConfig,
  PinConfig,
  RamHistoryEntry,
  RecoveryCodeConfig,
  SecurityAnalysis,
  ThemeId,
  UuidConfig,
  VaultConfig,
  VaultResult,
} from "./types/ciphergen";

const THEME_PREF_KEY = "ciphergen_theme_v1";

const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  length: 24,
  uppercase: true,
  lowercase: true,
  numbers: true,
  safeSymbols: true,
  extendedSymbols: false,
  excludeAmbiguous: true,
  customExclude: "",
  count: 1,
};

const DEFAULT_PASSPHRASE_CONFIG: PassphraseConfig = {
  wordCount: 6,
  separator: "-",
  capitalization: "title",
  includeNumber: true,
  language: "es",
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

const DEFAULT_UUID_CONFIG: UuidConfig = {
  uppercase: false,
  hyphens: true,
  count: 1,
};

const DEFAULT_BIP39_CONFIG: Bip39Config = {
  wordCount: "24",
  language: "en",
  count: 1,
};

const DEFAULT_RECOVERY_CONFIG: RecoveryCodeConfig = {
  format: "blocks5x2",
  count: 8,
};

const DEFAULT_VAULT_CONFIG: VaultConfig = {
  masterPassword: "",
  site: "",
  login: "",
  counter: 1,
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  safeSymbols: true,
  extendedSymbols: false,
  excludeAmbiguous: true,
  customExclude: "",
};

function loadSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_PREF_KEY) as ThemeId | null;
    if (
      saved === "obsidian" ||
      saved === "violet" ||
      saved === "matrix" ||
      saved === "amber" ||
      saved === "ios-light" ||
      saved === "cyber-light"
    ) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "obsidian";
}

export default function App() {
  const [theme, setTheme] = useState<ThemeId>(loadSavedTheme);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [autoLockedReason, setAutoLockedReason] = useState<boolean>(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricLabel, setBiometricLabel] = useState<string>("Biometría");
  const [biometricLockEnabled, setBiometricLockState] = useState<boolean>(
    getBiometricLockEnabled
  );
  const [autoLockMode, setAutoLockModeState] =
    useState<AutoLockMode>(getAutoLockMode);

  const [activeTab, setActiveTab] = useState<ActiveTab>("password");
  const [keySubMode, setKeySubMode] = useState<KeySubMode>("bip39");
  const [batchCount, setBatchCount] = useState<number>(1);
  const [masked, setMasked] = useState<boolean>(false);
  const [clipboardTtl, setClipboardTtl] = useState<ClipboardTtl>(30);

  const [passwordConfig, setPasswordConfig] = useState<PasswordConfig>(
    DEFAULT_PASSWORD_CONFIG
  );
  const [effectiveAlphabetSize, setEffectiveAlphabetSize] = useState<
    number | undefined
  >(undefined);
  const [passphraseConfig, setPassphraseConfig] = useState<PassphraseConfig>(
    DEFAULT_PASSPHRASE_CONFIG
  );
  const [pinConfig, setPinConfig] = useState<PinConfig>(DEFAULT_PIN_CONFIG);
  const [keyConfig, setKeyConfig] = useState<KeyConfig>(DEFAULT_KEY_CONFIG);
  const [uuidConfig, setUuidConfig] = useState<UuidConfig>(DEFAULT_UUID_CONFIG);
  const [bip39Config, setBip39Config] =
    useState<Bip39Config>(DEFAULT_BIP39_CONFIG);
  const [recoveryConfig, setRecoveryConfig] = useState<RecoveryCodeConfig>(
    DEFAULT_RECOVERY_CONFIG
  );

  // Stateless Argon2id Vault state (RAM only)
  const [vaultConfig, setVaultConfig] =
    useState<VaultConfig>(DEFAULT_VAULT_CONFIG);
  const [vaultResult, setVaultResult] = useState<VaultResult | null>(null);

  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [customSecret, setCustomSecret] = useState<string>("");
  const [customAnalysis, setCustomAnalysis] = useState<SecurityAnalysis | null>(
    null
  );

  // Ephemeral RAM-only session history
  const [ramHistory, setRamHistory] = useState<RamHistoryEntry[]>([]);
  const [historyRecording, setHistoryRecording] = useState<boolean>(true);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const historyRecordingRef = useRef<boolean>(true);

  // Offline QR modal state
  const [qrTarget, setQrTarget] = useState<{
    value: string;
    label?: string;
    entropyBits?: number;
  } | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | "all" | null>(null);
  const [timerState, setTimerState] = useState<ClipboardTimerState>({
    remainingSeconds: 0,
    totalSeconds: 30,
    active: false,
  });

  const clipboardRef = useRef<AutoClearClipboardController | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNativeRust = isTauriRuntime();

  useEffect(() => {
    historyRecordingRef.current = historyRecording;
  }, [historyRecording]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", !isLightTheme(theme));
    try {
      localStorage.setItem(THEME_PREF_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    void checkBiometricAvailability().then((status) => {
      if (!active) return;
      setBiometricAvailable(status.available);
      setBiometricLabel(status.label);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AutoClearClipboardController(
      createRuntimeClipboardAdapter(),
      (state) => setTimerState(state)
    );
    clipboardRef.current = controller;
    return () => controller.dispose();
  }, []);

  const handleToggleBiometricLock = useCallback((enabled: boolean) => {
    setBiometricLockState(enabled);
    setBiometricLockEnabled(enabled);
  }, []);

  const handleAutoLockModeChange = useCallback((mode: AutoLockMode) => {
    setAutoLockModeState(mode);
    setAutoLockMode(mode);
  }, []);

  const recordGeneratedItems = useCallback((generated: GeneratedItem[]) => {
    if (!historyRecordingRef.current || generated.length === 0) return;
    setRamHistory((prev) => appendRamHistory(prev, generated));
  }, []);

  const handleRecordVaultHistory = useCallback(
    (res: VaultResult, site: string, counter: number) => {
      if (!historyRecordingRef.current) return;
      setRamHistory((prev) =>
        appendRamHistory(prev, [
          {
            value: res.item.value,
            mode: "vaultDerived",
            entropyBits: res.item.entropyBits,
            meta: `${site} (v${counter})`,
          },
        ])
      );
    },
    []
  );

  const runGeneration = useCallback(async () => {
    if (activeTab === "analyzer" || activeTab === "vault") return;
    try {
      setError(null);
      if (activeTab === "password") {
        const res = await generatePasswords({
          ...passwordConfig,
          count: batchCount,
        });
        setItems(res.items);
        setEffectiveAlphabetSize(res.effectiveAlphabetSize);
        setAnalysis(res.analysis);
        recordGeneratedItems(res.items);
      } else if (activeTab === "passphrase") {
        const res = await generatePassphrases({
          ...passphraseConfig,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
        recordGeneratedItems(res.items);
      } else if (keySubMode === "pin") {
        const res = await generatePins({
          ...pinConfig,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
        recordGeneratedItems(res.items);
      } else if (keySubMode === "uuid") {
        const res = await generateUuids({
          ...uuidConfig,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
        recordGeneratedItems(res.items);
      } else if (keySubMode === "bip39") {
        const res = await generateBip39({
          ...bip39Config,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
        recordGeneratedItems(res.items);
      } else if (keySubMode === "recovery") {
        const res = await generateRecoveryCodes({
          ...recoveryConfig,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
        recordGeneratedItems(res.items);
      } else {
        const format =
          keySubMode === "hex"
            ? "hex"
            : keySubMode === "base32"
            ? "base32"
            : "base64Url";
        const bits =
          format === "base32" &&
          (keyConfig.bits === "192" || keyConfig.bits === "512")
            ? "256"
            : keyConfig.bits;
        const res = await generateKeys({
          ...keyConfig,
          format,
          bits,
          count: batchCount,
        });
        setItems(res.items);
        setAnalysis(res.analysis);
        recordGeneratedItems(res.items);
      }
      setCopiedIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [
    activeTab,
    batchCount,
    bip39Config,
    keyConfig,
    keySubMode,
    passphraseConfig,
    passwordConfig,
    pinConfig,
    recordGeneratedItems,
    recoveryConfig,
    uuidConfig,
  ]);

  useEffect(() => {
    if (unlocked) {
      void runGeneration();
    }
  }, [runGeneration, unlocked]);

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

  const handleCopyPlain = useCallback(
    async (value: string) => {
      if (!clipboardRef.current) return;
      await clipboardRef.current.copyWithAutoClear(value, clipboardTtl);
    },
    [clipboardTtl]
  );

  const handleCopyItem = useCallback(
    async (value: string, index: number) => {
      await handleCopyPlain(value);
      setCopiedIndex(index);
    },
    [handleCopyPlain]
  );

  const handleCopyAll = async () => {
    if (items.length === 0) return;
    const joined = items.map((i) => i.value).join("\n");
    await handleCopyPlain(joined);
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
    setVaultConfig((prev) => ({ ...prev, masterPassword: "" }));
    setVaultResult(null);
    setRamHistory([]);
    setQrTarget(null);
    setHistoryOpen(false);
    await handleClearClipboard();
  }, [handleClearClipboard]);

  const handleLockNow = useCallback(
    async (fromAutoLock = false) => {
      await handlePanicWipe();
      setAutoLockedReason(fromAutoLock);
      setUnlocked(false);
    },
    [handlePanicWipe]
  );

  // Auto-lock on minimize / background (desktop minimize + mobile background)
  useEffect(() => {
    if (!unlocked) return;
    const delayMs = autoLockDelayMs(autoLockMode);
    if (delayMs === null) return;

    const clearPending = () => {
      if (autoLockTimerRef.current !== null) {
        clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        clearPending();
        if (delayMs === 0) {
          void handleLockNow(true);
        } else {
          autoLockTimerRef.current = setTimeout(() => {
            if (document.visibilityState === "hidden") {
              void handleLockNow(true);
            }
          }, delayMs);
        }
      } else {
        clearPending();
        if (
          hiddenAtRef.current !== null &&
          Date.now() - hiddenAtRef.current >= delayMs
        ) {
          hiddenAtRef.current = null;
          void handleLockNow(true);
        } else {
          hiddenAtRef.current = null;
        }
      }
    };

    const onPageHide = () => {
      if (delayMs === 0) {
        void handleLockNow(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearPending();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [autoLockMode, handleLockNow, unlocked]);

  const handlePreset = (preset: SecurityPresetId) => {
    if (preset === "daily") {
      setActiveTab("password");
      setBatchCount(1);
      setPasswordConfig({
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        safeSymbols: true,
        extendedSymbols: false,
        excludeAmbiguous: true,
        customExclude: "",
        count: 1,
      });
    } else if (preset === "masterVault") {
      setActiveTab("passphrase");
      setBatchCount(1);
      setPassphraseConfig({
        wordCount: 7,
        separator: "-",
        capitalization: "title",
        includeNumber: true,
        language: "es",
        count: 1,
      });
    } else if (preset === "postQuantum") {
      setActiveTab("password");
      setBatchCount(1);
      setPasswordConfig({
        length: 44,
        uppercase: true,
        lowercase: true,
        numbers: true,
        safeSymbols: true,
        extendedSymbols: true,
        excludeAmbiguous: false,
        customExclude: "",
        count: 1,
      });
    } else if (preset === "bip39Seed") {
      setActiveTab("keys");
      setKeySubMode("bip39");
      setBatchCount(1);
      setBip39Config({
        wordCount: "24",
        language: "en",
        count: 1,
      });
    } else if (preset === "apiBase64Url") {
      setActiveTab("keys");
      setKeySubMode("base64Url");
      setBatchCount(1);
      setKeyConfig({
        format: "base64Url",
        bits: "256",
        uppercase: false,
        grouped: false,
        count: 1,
      });
    } else if (preset === "recoveryKit") {
      setActiveTab("keys");
      setKeySubMode("recovery");
      setBatchCount(8);
      setRecoveryConfig({
        format: "blocks5x2",
        count: 8,
      });
    }
  };

  useEffect(() => {
    if (!unlocked) return;
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
      } else if (e.key === "Escape" && !isEditable && !qrTarget) {
        e.preventDefault();
        void handlePanicWipe();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCopyItem, handlePanicWipe, items, qrTarget, runGeneration, unlocked]);

  if (!unlocked) {
    return (
      <SplashScreen
        biometricAvailable={biometricAvailable}
        biometricLabel={biometricLabel}
        biometricLockEnabled={biometricLockEnabled}
        autoLockedReason={autoLockedReason}
        onUnlockBiometric={() =>
          authenticateWithBiometrics("Desbloquear CipherGenX")
        }
        onEnter={() => {
          setAutoLockedReason(false);
          setUnlocked(true);
        }}
        onToggleBiometricLock={handleToggleBiometricLock}
      />
    );
  }

  return (
    <div className="cyber-bg safe-area-pad min-h-screen w-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <Header
          theme={theme}
          onThemeChange={setTheme}
          isNativeRust={isNativeRust}
          onPanicWipe={handlePanicWipe}
          biometricAvailable={biometricAvailable}
          biometricLabel={biometricLabel}
          biometricLockEnabled={biometricLockEnabled}
          onToggleBiometricLock={handleToggleBiometricLock}
          onLockNow={() => void handleLockNow(false)}
          autoLockMode={autoLockMode}
          onAutoLockModeChange={handleAutoLockModeChange}
          historyCount={ramHistory.length}
          historyOpen={historyOpen}
          onToggleHistory={() => setHistoryOpen((v) => !v)}
        />

        {historyOpen && (
          <RamHistoryDrawer
            entries={ramHistory}
            recording={historyRecording}
            onToggleRecording={() => setHistoryRecording((r) => !r)}
            onCopy={(val) => void handleCopyPlain(val)}
            onShowQr={(value, label, entropyBits) =>
              setQrTarget({ value, label, entropyBits })
            }
            onRemoveEntry={(id) =>
              setRamHistory((prev) => prev.filter((e) => e.id !== id))
            }
            onClearAll={() => setRamHistory([])}
            onClose={() => setHistoryOpen(false)}
          />
        )}

        <div className="space-y-3">
          <ModeTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab !== "analyzer" && activeTab !== "vault" && (
            <QuickPresets onSelect={handlePreset} />
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {activeTab === "analyzer" ? (
          <ManualAnalyzerPanel
            secret={customSecret}
            onSecretChange={setCustomSecret}
            analysis={customAnalysis}
          />
        ) : activeTab === "vault" ? (
          <VaultPanel
            config={vaultConfig}
            onChange={setVaultConfig}
            result={vaultResult}
            onResult={setVaultResult}
            onCopy={(val) => void handleCopyPlain(val)}
            onShowQr={(value, label, entropyBits) =>
              setQrTarget({ value, label, entropyBits })
            }
            onRecordHistory={handleRecordVaultHistory}
          />
        ) : (
          <>
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
              onCopyPlain={(val) => void handleCopyPlain(val)}
              onCopyAll={handleCopyAll}
              onClearClipboard={handleClearClipboard}
              onRegenerate={runGeneration}
              onShowQr={(value, label, entropyBits) =>
                setQrTarget({ value, label, entropyBits })
              }
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <section className="cyber-panel rounded-2xl p-4 sm:p-5 lg:col-span-6">
                <h2 className="mb-4 text-sm font-bold tracking-tight text-slate-200">
                  {activeTab === "password"
                    ? "Parámetros de Contraseña"
                    : activeTab === "passphrase"
                    ? "Parámetros de Frase Diceware (ES / EN)"
                    : "Parámetros de Llaves, BIP-39 y Tokens"}
                </h2>

                {activeTab === "password" && (
                  <PasswordConfigPanel
                    config={passwordConfig}
                    onChange={setPasswordConfig}
                    effectiveAlphabetSize={effectiveAlphabetSize}
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
                    uuidConfig={uuidConfig}
                    onUuidChange={setUuidConfig}
                    bip39Config={bip39Config}
                    onBip39Change={setBip39Config}
                    recoveryConfig={recoveryConfig}
                    onRecoveryChange={setRecoveryConfig}
                    onBatchCountChange={setBatchCount}
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
          </>
        )}

        <PrivacyFooter />
      </div>

      <QrCodeModal
        value={qrTarget?.value ?? null}
        label={qrTarget?.label}
        entropyBits={qrTarget?.entropyBits}
        onClose={() => setQrTarget(null)}
        onCopy={(val) => void handleCopyPlain(val)}
      />
    </div>
  );
}
