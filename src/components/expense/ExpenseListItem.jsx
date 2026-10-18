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
      className={`flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer ${
        isSelected
          ? 'bg-[#181d3a]/5 border border-[#181d3a]/20'
          : 'hover:bg-[#f3f3f3] border border-transparent'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        {isSelectable && (
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${
              isSelected
                ? 'bg-[#181d3a] border-[#181d3a] text-white shadow-sm'
                : 'border-[#cbd5e1] bg-white group-hover:border-[#94a3b8]'
            }`}
          >
            {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
          </div>
        )}
        <div className="w-12 h-12 rounded-full bg-[#e2e2e2] flex items-center justify-center text-2xl flex-shrink-0">
          {category?.icon || '📦'}
        </div>
        <div className="flex flex-col">
          <span className="text-body-md font-semibold text-[#1a1c1c] leading-snug">
            {expense.description || category?.name || 'Expense'}
          </span>
          <span className="text-body-sm text-[#64748B]">
            {category?.name}{expense.paymentMethod ? ` · ${expense.paymentMethod}` : ''}
            {' · '}{dateLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-body-md font-semibold text-[#1a1c1c]">
          {formatCurrency(expense.amountInCents)}
        </span>
        {!isSelectable && showRepeat && onRepeat && (
          <button
            aria-label="Repeat expense"
            onClick={e => { e.stopPropagation(); onRepeat(); }}
            className="w-8 h-8 rounded-full bg-[#eeeeee] flex items-center justify-center text-[#64748B] hover:text-[#181d3a] hover:bg-[#dee1ff] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        )}
      </div>
    </div>
  );
}
