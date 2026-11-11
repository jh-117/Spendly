export default function EmptyState({ emoji = '📭', title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-white ring-1 ring-black/[0.05] shadow-2xs flex items-center justify-center text-3xl mb-4">
        {emoji}
      </div>
      <h3 className="text-base font-bold text-[#0F1424] tracking-tight mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-[#64748B] max-w-[260px] mb-5 leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-[#0F1424] hover:bg-[#1E2746] text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-xs active:scale-95 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
