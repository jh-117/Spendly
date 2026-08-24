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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleCancel}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-4 sm:mx-auto bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4 mb-4 sm:mb-0">
        <h2 className="text-headline-lg-mobile text-[#1a1c1c] font-semibold">{title}</h2>
        <p className="text-body-sm text-[#64748B]">{message}</p>

        {requireTyping && (
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-[#64748B] uppercase">
              Type <span className="text-[#181d3a] font-bold">{requireTyping}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              className="w-full border border-[#e2e2e2] rounded-xl px-4 py-2 text-body-md text-[#1a1c1c] focus:outline-none focus:ring-2 focus:ring-[#181d3a]"
              placeholder={requireTyping}
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-full border border-[#e2e2e2] text-body-md text-[#46464d] font-semibold hover:bg-[#f3f3f3] active:scale-95 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 py-3 rounded-full text-body-md font-semibold transition-all active:scale-95 ${
              destructive
                ? 'bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffbdb8] disabled:opacity-40'
                : 'bg-[#181d3a] text-white hover:opacity-90 disabled:opacity-40'
            } ${!canConfirm ? 'cursor-not-allowed' : ''}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
