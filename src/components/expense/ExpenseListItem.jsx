import { formatCurrency, formatExpenseDate } from '../../lib/calculations';

/**
 * Single expense list item.
 * Props:
 *   expense: Expense
 *   category: Category
 *   showRepeat: bool
 *   onRepeat: () => void
 *   onClick: () => void
 */
export default function ExpenseListItem({
  expense,
  category,
  showRepeat = false,
  onRepeat,
  onClick,
  isSelectable = false,
  isSelected = false,
  onToggleSelect,
}) {
  const dateLabel = formatExpenseDate(expense.expenseDate, new Date());

  const handleClick = (e) => {
    if (isSelectable && onToggleSelect) {
      onToggleSelect(expense.id);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-[16px] transition-all group cursor-pointer active:scale-[0.99] ${
        isSelected
          ? 'bg-[#0F1424]/5 ring-1 ring-[#0F1424]/20'
          : 'hover:bg-[#F8FAFC]'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {isSelectable && (
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
              isSelected
                ? 'bg-[#0F1424] border-[#0F1424] text-white shadow-xs'
                : 'border-[#cbd5e1] bg-white group-hover:border-[#94a3b8]'
            }`}
          >
            {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
          </div>
        )}
        <div className="w-11 h-11 rounded-[14px] bg-[#F1F5F9] ring-1 ring-black/[0.04] flex items-center justify-center text-xl flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
          {category?.icon || '📦'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-[#0F1424] leading-snug truncate">
            {expense.description || category?.name || 'Expense'}
          </span>
          <span className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5 truncate">
            <span>{category?.name}</span>
            {expense.paymentMethod && (
              <>
                <span>·</span>
                <span className="capitalize">{expense.paymentMethod}</span>
              </>
            )}
            <span>·</span>
            <span>{dateLabel}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <span className="text-sm sm:text-base font-bold text-[#0F1424] tabular-nums tracking-tight">
          {formatCurrency(expense.amountInCents)}
        </span>
        {!isSelectable && showRepeat && onRepeat && (
          <button
            aria-label="Repeat expense"
            onClick={e => { e.stopPropagation(); onRepeat(); }}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] ring-1 ring-black/[0.04] flex items-center justify-center text-[#64748B] hover:text-[#0F1424] hover:bg-[#dee1ff] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <span className="material-symbols-outlined text-[17px]">refresh</span>
          </button>
        )}
      </div>
    </div>
  );
}
