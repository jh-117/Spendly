import { useState } from 'react';

/**
 * Confirm dialog modal.
 * Props:
 *   isOpen, title, message, confirmLabel, cancelLabel,
 *   onConfirm, onCancel,
 *   requireTyping (string) — user must type this exact string to enable confirm button
 *   destructive (bool) — styles confirm button in danger style
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  requireTyping = null,
  destructive = false,
}) {
  const [typed, setTyped] = useState('');

  if (!isOpen) return null;

  const canConfirm = requireTyping ? typed === requireTyping : true;

  const handleConfirm = () => {
    if (canConfirm) {
      setTyped('');
      onConfirm();
    }
  };

  const handleCancel = () => {
    setTyped('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleCancel}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-auto bg-white rounded-[28px] ring-1 ring-black/[0.06] shadow-2xl p-6 flex flex-col gap-4 mb-4 sm:mb-0">
        <h2 className="text-lg font-bold text-[#0F1424] tracking-tight">{title}</h2>
        <p className="text-xs text-[#64748B] leading-relaxed">{message}</p>

        {requireTyping && (
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Type <span className="text-[#0F1424] font-bold">{requireTyping}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              className="w-full bg-[#F8FAFC] ring-1 ring-black/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#0F1424] focus:outline-none focus:ring-2 focus:ring-[#0F1424]"
              placeholder={requireTyping}
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-2.5 mt-2">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-full bg-white ring-1 ring-black/[0.08] text-xs font-bold text-[#64748B] hover:text-[#0F1424] hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-2xs"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 py-3 rounded-full text-xs font-bold transition-all active:scale-95 shadow-xs ${
              destructive
                ? 'bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-40'
                : 'bg-[#0F1424] hover:bg-[#1E2746] text-white disabled:opacity-40'
            } ${!canConfirm ? 'cursor-not-allowed' : ''}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
