import React, { useState } from 'react';
import { X, Delete } from 'lucide-react';

interface CbtCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CbtCalculator: React.FC<CbtCalculatorProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleSquareRoot = () => {
    const num = parseFloat(display);
    if (num < 0) {
      setDisplay('Error');
    } else {
      setDisplay(String(Math.sqrt(num)));
      setWaitingForOperand(true);
    }
  };

  const handlePercentage = () => {
    const num = parseFloat(display);
    setDisplay(String(num / 100));
    setWaitingForOperand(true);
  };

  const performOperation = (nextOp: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operation) {
      const current = prevValue || 0;
      let newValue = current;

      switch (operation) {
        case '+':
          newValue = current + inputValue;
          break;
        case '-':
          newValue = current - inputValue;
          break;
        case '×':
          newValue = current * inputValue;
          break;
        case '÷':
          newValue = inputValue !== 0 ? current / inputValue : 0;
          break;
        default:
          break;
      }

      setPrevValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperation(nextOp === '=' ? null : nextOp);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-slate-900 border-2 border-blue-500/60 rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 px-3 py-2 flex items-center justify-between border-b border-blue-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span className="text-xs font-bold tracking-wider text-white font-sans">JAMB CBT CALCULATOR</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Screen */}
      <div className="p-3 bg-slate-950 text-right border-b border-slate-800">
        <div className="text-[11px] text-slate-400 h-4 truncate">
          {prevValue !== null && operation ? `${prevValue} ${operation}` : ''}
        </div>
        <div className="text-2xl font-bold text-emerald-400 truncate tracking-tight py-1">
          {display}
        </div>
      </div>

      {/* Keypad */}
      <div className="p-3 grid grid-cols-4 gap-2 bg-slate-900 text-sm">
        <button
          onClick={handleClear}
          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold border border-red-500/30"
        >
          C
        </button>
        <button
          onClick={handleBackspace}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={handleSquareRoot}
          className="p-2 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 font-bold border border-blue-700/40"
        >
          √
        </button>
        <button
          onClick={() => performOperation('÷')}
          className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold"
        >
          ÷
        </button>

        <button
          onClick={() => handleDigit('7')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          7
        </button>
        <button
          onClick={() => handleDigit('8')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          8
        </button>
        <button
          onClick={() => handleDigit('9')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          9
        </button>
        <button
          onClick={() => performOperation('×')}
          className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold"
        >
          ×
        </button>

        <button
          onClick={() => handleDigit('4')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          4
        </button>
        <button
          onClick={() => handleDigit('5')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          5
        </button>
        <button
          onClick={() => handleDigit('6')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          6
        </button>
        <button
          onClick={() => performOperation('-')}
          className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold"
        >
          -
        </button>

        <button
          onClick={() => handleDigit('1')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          1
        </button>
        <button
          onClick={() => handleDigit('2')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          2
        </button>
        <button
          onClick={() => handleDigit('3')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          3
        </button>
        <button
          onClick={() => performOperation('+')}
          className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold"
        >
          +
        </button>

        <button
          onClick={handlePercentage}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700"
        >
          %
        </button>
        <button
          onClick={() => handleDigit('0')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          0
        </button>
        <button
          onClick={handleDecimal}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-semibold"
        >
          .
        </button>
        <button
          onClick={() => performOperation('=')}
          className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          =
        </button>
      </div>
    </div>
  );
};
