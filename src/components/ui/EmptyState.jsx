export default function EmptyState({ emoji = '📭', title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <span className="text-6xl grayscale opacity-50 mb-4">{emoji}</span>
      <h3 className="text-headline-lg-mobile text-[#1a1c1c] font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-body-sm text-[#64748B] max-w-[260px] mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-[#181d3a] text-white text-body-sm font-semibold px-6 py-3 rounded-full hover:opacity-90 active:scale-95 transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
