import { useRef, useEffect } from 'react';

/**
 * Large centered amount input with elegant typography.
 * Props: value, onChange, autoFocus
 */
export default function AmountInput({ value, onChange, autoFocus = true }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleQuickAdd = (addValue) => {
    const current = parseFloat(value) || 0;
    const next = (current + addValue).toFixed(2);
    // If it ends with .00, keep it clean or format appropriately
    onChange(next.replace(/\.00$/, ''));
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Centered Amount Display Box */}
      <div className="relative flex items-center justify-center w-full max-w-sm px-4">
        <span className="text-xl sm:text-2xl font-bold text-[#64748B]/70 mr-2 select-none tracking-wider">
          RM
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="text-4xl sm:text-5xl font-black text-[#0F1424] bg-transparent border-none outline-none text-left w-auto min-w-[120px] max-w-[240px] focus:ring-0 placeholder:text-[#cbd5e1] tracking-tight tabular-nums"
          style={{ caretColor: '#0F1424' }}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="w-7 h-7 rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#0F1424] flex items-center justify-center transition-colors ml-2"
            title="Clear amount"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* Quick Amount Suggestion Pills */}
      <div className="flex items-center gap-2 mt-4">
        {[5, 10, 20, 50].map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => handleQuickAdd(inc)}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white ring-1 ring-black/[0.06] text-[#64748B] hover:text-[#0F1424] hover:bg-[#F8FAFC] shadow-2xs active:scale-95 transition-all"
          >
            +{inc}
          </button>
        ))}
      </div>
    </div>
  );
}
