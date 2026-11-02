import React, { useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';
import { sounds } from '../utils/fonepayQr';

interface CalculatorNumpadProps {
  expression: string;
  onExpressionChange: (val: string) => void;
  onClear: () => void;
  onEquals: () => void;
}

export const CalculatorNumpad: React.FC<CalculatorNumpadProps> = ({
  expression,
  onExpressionChange,
  onClear,
  onEquals,
}) => {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef<boolean>(false);

  const triggerHaptic = (ms = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Safe ignore
      }
    }
  };

  const handleDigit = (digit: string) => {
    triggerHaptic();
    sounds.playKeyClick();

    if (!expression || expression === '0') {
      if (digit === '00') return;
      onExpressionChange(digit);
      return;
    }

    // Limit expression to reasonable length to avoid overflow
    if (expression.length >= 32) return;

    onExpressionChange(expression + digit);
  };

  const handleOperator = (op: '+' | '-' | '×') => {
    triggerHaptic();
    sounds.playKeyClick();

    if (!expression) return; // Cannot start with an operator

    const trimmed = expression.trimEnd();
    // If expression ends with an operator (e.g., ends with + or - or ×)
    if (/[\+\-×]$/.test(trimmed)) {
      // Replace previous operator
      const base = trimmed.slice(0, -1).trimEnd();
      onExpressionChange(`${base} ${op} `);
      return;
    }

    onExpressionChange(`${trimmed} ${op} `);
  };

  const handleBackspace = () => {
    triggerHaptic();
    sounds.playKeyClick();

    if (!expression || expression.length <= 1) {
      onClear();
      return;
    }

    // If expression ends with space and operator like " + "
    if (/\s[\+\-×]\s?$/.test(expression)) {
      onExpressionChange(expression.replace(/\s[\+\-×]\s?$/, ''));
      return;
    }

    onExpressionChange(expression.slice(0, -1));
  };

  const handleAllClear = () => {
    triggerHaptic(40);
    sounds.playClear();
    onClear();
  };

  // Long press handling on Backspace button (hold to All Clear)
  const startLongPress = () => {
    isLongPressTriggered.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      handleAllClear();
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleBackspaceClick = () => {
    if (!isLongPressTriggered.current) {
      handleBackspace();
    }
    isLongPressTriggered.current = false;
  };

  // Keyboard shortcut listener for desktop or tablet keyboards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('-');
      } else if (e.key === '*' || e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        onEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleAllClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expression, onEquals]);

  return (
    <div className="w-full flex flex-col select-none shrink-0">
      {/* 4 columns x 4 rows keypad:
          Row 1: [ 1 ] [ 2 ] [ 3 ] [ ⌫ ]
          Row 2: [ 4 ] [ 5 ] [ 6 ] [ × ]
          Row 3: [ 7 ] [ 8 ] [ 9 ] [ - ]
          Row 4: [ 0 ] [ 00 ] [ + ] [ = ]
      */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {/* Row 1: 1, 2, 3, Combined Backspace / Hold: AC */}
        <button
          type="button"
          onClick={() => handleDigit('1')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleDigit('2')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleDigit('3')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          3
        </button>
        {/* Combined Backspace + Hold to Clear (Clean icon without Hold:AC text) */}
        <button
          type="button"
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onClick={handleBackspaceClick}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Delete digit, hold to clear all"
          title="Tap to delete, hold to clear all"
          className="h-13 sm:h-14 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 active:scale-95 text-neutral-700 font-bold border border-neutral-200 shadow-2xs flex items-center justify-center transition-all cursor-pointer select-none group"
        >
          <Delete className="w-5 h-5 text-neutral-700 group-hover:text-neutral-900 transition-colors" />
        </button>

        {/* Row 2: 4, 5, 6, × */}
        <button
          type="button"
          onClick={() => handleDigit('4')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleDigit('5')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleDigit('6')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleOperator('×')}
          aria-label="Multiply"
          className="h-13 sm:h-14 rounded-2xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 active:scale-95 text-amber-900 font-black text-2xl border border-amber-200 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          ×
        </button>

        {/* Row 3: 7, 8, 9, - */}
        <button
          type="button"
          onClick={() => handleDigit('7')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleDigit('8')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleDigit('9')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleOperator('-')}
          aria-label="Subtract"
          className="h-13 sm:h-14 rounded-2xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 active:scale-95 text-amber-900 font-black text-2xl border border-amber-200 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          -
        </button>

        {/* Row 4: 0, 00, +, = */}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleDigit('00')}
          className="h-13 sm:h-14 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 text-neutral-900 font-bold text-xl sm:text-2xl border border-neutral-200/90 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          00
        </button>
        <button
          type="button"
          onClick={() => handleOperator('+')}
          aria-label="Add"
          className="h-13 sm:h-14 rounded-2xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 active:scale-95 text-amber-900 font-black text-2xl border border-amber-200 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          +
        </button>
        {/* Equals button */}
        <button
          type="button"
          onClick={onEquals}
          aria-label="Equals"
          className="h-13 sm:h-14 rounded-2xl bg-[#BA1A1A] hover:bg-[#9e1616] active:bg-[#851212] active:scale-95 text-white font-black text-2xl shadow-2xs flex items-center justify-center transition-all cursor-pointer"
        >
          =
        </button>
      </div>
    </div>
  );
};
