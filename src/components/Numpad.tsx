import React, { useEffect } from 'react';
import { Delete, RotateCcw, Plus } from 'lucide-react';
import { sounds } from '../utils/fonepayQr';

interface NumpadProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  onAddAmount: (delta: number) => void;
}

const PRESET_AMOUNTS = [10, 20, 50, 100, 500, 1000];

export const Numpad: React.FC<NumpadProps> = ({
  value,
  onChange,
  onClear,
  onAddAmount,
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Safe ignore
      }
    }
  };

  const handleDigit = (digit: string) => {
    triggerHaptic();
    sounds.playKeyClick();

    // Prevent multiple dots
    if (digit === '.' && value.includes('.')) return;

    // Handle initial zero or empty
    if (value === '0' && digit !== '.') {
      onChange(digit);
      return;
    }

    // Limit decimal places to 2
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1] && parts[1].length >= 2 && digit !== '00') {
        return;
      }
      if (digit === '00') {
        if (parts[1].length === 0) onChange(value + '00');
        else if (parts[1].length === 1) onChange(value + '0');
        return;
      }
    }

    // Maximum realistic transaction limit (e.g., NPR 10,00,000)
    if (value.length >= 8 && digit !== '.') return;

    onChange((value || '') + digit);
  };

  const handleBackspace = () => {
    triggerHaptic();
    sounds.playKeyClick();
    if (!value || value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    triggerHaptic();
    sounds.playClear();
    onClear();
  };

  const handleQuickAdd = (amount: number) => {
    triggerHaptic();
    sounds.playKeyClick();
    onAddAmount(amount);
  };

  // Physical keyboard support for desktop or tablet keyboards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (like remarks)
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDigit('.');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value]);

  const numpadButtons = [
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '.', action: () => handleDigit('.') },
    { label: '0', action: () => handleDigit('0') },
    { label: '00', action: () => handleDigit('00') },
  ];

  return (
    <div className="w-full flex flex-col gap-1.5 sm:gap-2 select-none shrink-0">
      {/* Quick Add Amount Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0 mr-0.5 flex items-center gap-0.5">
          <Plus className="w-2.5 h-2.5" /> Add
        </span>
        {PRESET_AMOUNTS.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => handleQuickAdd(amt)}
            className="px-2 py-1 rounded-md sm:rounded-lg bg-neutral-100 hover:bg-red-50 hover:text-red-700 active:scale-95 text-neutral-800 text-[11px] sm:text-xs font-semibold border border-neutral-200/80 transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            +{amt}
          </button>
        ))}
      </div>

      {/* Main Grid: 3 columns x 4 rows + Right action column */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {/* Digits 1 to 9 */}
        <div className="col-span-3 grid grid-cols-3 gap-1.5 sm:gap-2">
          {numpadButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.action}
              className="h-11 sm:h-12 md:h-13 rounded-xl bg-white hover:bg-neutral-50 active:bg-neutral-100 active:scale-95 text-neutral-900 font-bold text-lg sm:text-xl shadow-2xs border border-neutral-200 flex items-center justify-center transition-all cursor-pointer"
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Right column: Backspace & Clear */}
        <div className="col-span-1 flex flex-col gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete last digit"
            className="flex-1 min-h-[44px] rounded-xl bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 active:scale-95 text-neutral-700 font-bold shadow-2xs border border-neutral-200 flex flex-col items-center justify-center transition-all cursor-pointer group"
          >
            <Delete className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600 group-hover:text-neutral-900 transition-colors" />
            <span className="text-[9px] sm:text-[10px] font-medium text-neutral-500 mt-0.5">Del</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            aria-label="Clear all"
            className="flex-1 min-h-[44px] rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 active:scale-95 text-red-700 font-bold shadow-2xs border border-red-200 flex flex-col items-center justify-center transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            <span className="text-[9px] sm:text-[10px] font-bold text-red-600 mt-0.5">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
