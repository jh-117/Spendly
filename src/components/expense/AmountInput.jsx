import { useRef, useEffect } from 'react';

/**
 * Large centered amount input matching the design spec.
 * Props: value, onChange, autoFocus
 */
export default function AmountInput({ value, onChange, autoFocus = true }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="relative flex items-center justify-center w-full">
      <span className="text-headline-lg text-[#64748B] absolute left-4 sm:left-12 pointer-events-none select-none">
        RM
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-amount-input text-[#181d3a] bg-transparent border-none outline-none text-center w-full focus:ring-0 placeholder:text-[#dadada] font-semibold"
        style={{ caretColor: '#181d3a' }}
      />
    </div>
  );
}
