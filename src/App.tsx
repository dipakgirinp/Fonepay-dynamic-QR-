import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Settings, QrCode } from 'lucide-react';
import {
  FonepayMerchantInfo,
  DEFAULT_MERCHANT,
  buildFonepayQr,
} from './utils/fonepayQr';
import { evaluateBODMAS, formatRsDisplay } from './utils/calculator';
import { CalculatorNumpad } from './components/CalculatorNumpad';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Merchant details for receiving the amount (default empty, loaded from localStorage if set)
  const [merchant, setMerchant] = useState<FonepayMerchantInfo>(() => {
    try {
      const saved = localStorage.getItem('fonepay_merchant_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.terminalId) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return DEFAULT_MERCHANT;
  });

  // Calculation expression entered via calculator keypad (e.g. "100 + 20 + 25" or "200")
  const [expression, setExpression] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Check whether a business QR has been added from settings
  const hasQr = Boolean(merchant && merchant.terminalId);

  // Track online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save merchant info to local storage
  const handleSaveMerchant = (updated: FonepayMerchantInfo) => {
    setMerchant(updated);
    try {
      localStorage.setItem('fonepay_merchant_info', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Immediate BODMAS evaluation of current expression
  const calculatedAmount = useMemo(() => {
    return evaluateBODMAS(expression);
  }, [expression]);

  // Generate authentic Fonepay QR string automatically:
  // - If calculatedAmount > 0: Dynamic QR is generated with the calculated amount
  // - If calculatedAmount === 0 (or expression empty): Static QR is generated
  const { qrPayload } = useMemo(() => {
    if (!hasQr) return { qrPayload: '', isDynamic: false, formattedAmount: '' };
    return buildFonepayQr(calculatedAmount, '', merchant);
  }, [calculatedAmount, merchant, hasQr]);

  // When '=' is pressed, replace the expression with the evaluated result so new calculations can continue
  const handleEquals = () => {
    if (!expression) return;
    const result = evaluateBODMAS(expression);
    if (result > 0) {
      const formatted = result % 1 === 0 ? String(result) : String(parseFloat(result.toFixed(2)));
      setExpression(formatted);
    } else {
      setExpression('');
    }
  };

  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden bg-white text-neutral-900 flex flex-col justify-between selection:bg-red-500 selection:text-white p-2 sm:p-3 md:p-4 pb-1 sm:pb-2 select-none">
      {/* Top Header Bar */}
      <header className="w-full max-w-md md:max-w-4xl mx-auto px-1 flex items-center justify-between shrink-0 h-10 sm:h-11">
        <div className="flex items-center gap-2">
          {/* Fonepay Logo Badge */}
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#BA1A1A] flex items-center justify-center text-white shadow-2xs shrink-0">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 18c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-4.9-3.9l1.4 1.4C9.4 14.6 10.6 14 12 14s2.6.6 3.5 1.5l1.4-1.4C15.6 12.8 13.9 12 12 12s-3.6.8-4.9 2.1zm-2.8-2.8l1.4 1.4C7.4 11 9.6 10 12 10s4.6 1 6.3 2.7l1.4-1.4C17.6 9.2 14.9 8 12 8s-5.6 1.2-7.7 3.3z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-xs sm:text-sm text-neutral-900 leading-none truncate max-w-[160px] sm:max-w-[220px]">
                {hasQr ? merchant.merchantName : 'Your business'}
              </h1>
              {isOffline && (
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded border border-amber-200">
                  Offline
                </span>
              )}
            </div>
            <p className="text-[9px] sm:text-[10px] text-neutral-500 font-mono leading-tight mt-0.5">
              {hasQr ? `Terminal: ${merchant.terminalId}` : 'Tap Settings to add QR'}
            </p>
          </div>
        </div>

        {/* Setting page button in the top right corner */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 sm:p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 border border-neutral-200/80 shadow-2xs text-neutral-700 hover:text-neutral-900 transition-all cursor-pointer shrink-0"
          aria-label="Settings to change destination"
          title="Change destination account"
        >
          <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      </header>

      {/* Main Content: Balanced ratio for zero-scroll on all mobile devices */}
      <main className="w-full max-w-md md:max-w-4xl mx-auto flex-1 min-h-0 flex flex-col md:flex-row items-center justify-end md:justify-between gap-2.5 md:gap-8 py-0.5">
        {/* Top / Left Section: Two Displays + QR Code */}
        <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-[340px] sm:max-w-[380px] flex flex-col items-center justify-center flex-1 min-h-0 max-h-full">
            
            {/* The Two Displays above the QR Code (Matching reference sketch) */}
            <div className="w-full flex items-center gap-2 sm:gap-2.5 mb-3.5 sm:mb-4 shrink-0">
              {/* Left Display (~70% width): Live calculation expression */}
              <div
                className="flex-1 min-w-0 h-13 sm:h-14 px-4 sm:px-4.5 bg-neutral-50 rounded-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-start overflow-x-auto scrollbar-none font-mono text-xl sm:text-2xl font-bold text-neutral-800 tracking-tight"
                title="Calculation Expression"
              >
                {expression ? (
                  <span className="whitespace-nowrap">{expression}</span>
                ) : (
                  <span className="text-neutral-300 font-normal text-base sm:text-lg select-none">0</span>
                )}
              </div>

              {/* Right Display (~30% width / fits 4 digits with comma 'Rs. 1,234'): Final calculated output */}
              <div
                className="min-w-[124px] sm:min-w-[136px] h-13 sm:h-14 px-3 sm:px-3.5 bg-red-50/90 rounded-2xl border border-red-200 text-[#BA1A1A] font-black text-base sm:text-lg flex items-center justify-center shrink-0 shadow-2xs"
                title="Calculated Total"
              >
                <span className="whitespace-nowrap truncate tracking-tight">
                  {calculatedAmount > 0 ? formatRsDisplay(calculatedAmount) : (expression ? 'Rs. 0' : 'Rs. —')}
                </span>
              </div>
            </div>

            {hasQr ? (
              /* Pure Borderless QR Code */
              <div className="aspect-square w-full h-auto max-h-[min(34vh,245px)] max-w-[min(34vh,245px)] flex items-center justify-center flex-1 min-h-0">
                <QRCodeSVG
                  value={qrPayload}
                  className="w-full h-full object-contain"
                  level="M"
                  includeMargin={false}
                />
              </div>
            ) : (
              /* Outline dotted box when no QR has been added yet */
              <div
                onClick={() => setIsSettingsOpen(true)}
                className="aspect-square w-full h-auto max-h-[min(34vh,245px)] max-w-[min(34vh,245px)] border-2 border-dashed border-neutral-300 rounded-3xl flex flex-col items-center justify-center p-5 text-center cursor-pointer hover:border-[#BA1A1A] hover:bg-red-50/20 active:scale-98 transition-all group select-none"
                title="Tap to add your static QR from settings"
              >
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 group-hover:bg-red-100 text-neutral-400 group-hover:text-[#BA1A1A] flex items-center justify-center mb-2 transition-colors">
                  <QrCode className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-neutral-700 group-hover:text-neutral-900 leading-snug max-w-[220px]">
                  Add Your static qr from the setting
                </p>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[#BA1A1A] mt-2 bg-red-50 border border-red-200/60 px-3 py-1 rounded-lg">
                  Open Settings
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom / Right Section: Retail Calculator Keypad (Flush with bottom, fixed gap) */}
        <div className="w-full max-w-[360px] md:max-w-[400px] shrink-0 pb-0">
          <CalculatorNumpad
            expression={expression}
            onExpressionChange={setExpression}
            onClear={() => setExpression('')}
            onEquals={handleEquals}
          />
        </div>
      </main>

      {/* Settings Modal (Change Destination & Scan QR) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        merchant={merchant}
        onSave={handleSaveMerchant}
      />
    </div>
  );
}
