import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useExpenses } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import {
  formatCurrency,
  filterByMonth,
  filterByDateRange,
  toYearMonth,
  formatExpenseDate,
  formatYearMonth,
  getPreviousYearMonth,
  getBillingCycle,
  getPreviousCycle,
  getNextCycle,
  getCategoryTotals,
  getCategoryPercentages,
} from '../lib/calculations';
import ExpenseListItem from '../components/expense/ExpenseListItem';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';

function getNextYearMonth(ym) {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month, 1);
  return format(d, 'yyyy-MM');
}

export default function History() {
  const navigate = useNavigate();
  const { expenses, deleteExpense } = useExpenses();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { toast, showToast } = useToast();

  const cycleStartDay = settings.cycleStartDay ?? 25;
  const adjustWeekend = settings.adjustWeekendPayday !== false;
  const isCalendarOnly = cycleStartDay === 1;

  // View mode: 'cycle' or 'month'
  const [viewMode, setViewMode] = useState(isCalendarOnly ? 'month' : 'cycle');

  // Month navigation
  const currentYM = toYearMonth(new Date());
  const [yearMonth, setYearMonth] = useState(currentYM);

  // Cycle navigation
  const currentCycle = useMemo(() => getBillingCycle(new Date(), cycleStartDay, adjustWeekend), [cycleStartDay, adjustWeekend]);
  const [activeCycle, setActiveCycle] = useState(() => getBillingCycle(new Date(), cycleStartDay, adjustWeekend));

  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Multi-Select Tally State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c; });
    return m;
  }, [categories]);

  // Expenses in current view (Cycle or Month)
  const viewExpenses = useMemo(() => {
    if (viewMode === 'cycle') {
      return filterByDateRange(expenses, activeCycle.startDate, activeCycle.endDate);
    }
    return filterByMonth(expenses, yearMonth);
  }, [expenses, viewMode, activeCycle, yearMonth]);

  // Filter by category and search query
  const filtered = useMemo(() => {
    let list = viewExpenses;
    if (selectedCategory) {
      list = list.filter(e => e.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => {
        const descMatch = (e.description || '').toLowerCase().includes(q);
        const catName = catMap[e.categoryId]?.name?.toLowerCase() || '';
        const catMatch = catName.includes(q);
        const amountMatch = (e.amountInCents / 100).toFixed(2).includes(q) || String(e.amountInCents / 100).includes(q);
        return descMatch || catMatch || amountMatch;
      });
    }
    return list;
  }, [viewExpenses, selectedCategory, searchQuery, catMap]);

  // Group by date desc
  const grouped = useMemo(() => {
    const map = {};
    for (const e of filtered) {
      if (!map[e.expenseDate]) map[e.expenseDate] = [];
      map[e.expenseDate].push(e);
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        total: items.reduce((s, e) => s + e.amountInCents, 0),
      }));
  }, [filtered]);

  // Active categories in current view
  const activeCatsInView = useMemo(() => {
    const ids = new Set(viewExpenses.map(e => e.categoryId));
    return categories.filter(c => ids.has(c.id) && c.isActive);
  }, [viewExpenses, categories]);

  const canGoNext = viewMode === 'cycle'
    ? activeCycle.startDate < currentCycle.startDate
    : yearMonth < currentYM;

  const handlePrev = () => {
    if (viewMode === 'cycle') {
      setActiveCycle(prev => getPreviousCycle(prev, cycleStartDay, adjustWeekend));
    } else {
      setYearMonth(prev => getPreviousYearMonth(prev));
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (viewMode === 'cycle') {
      setActiveCycle(prev => getNextCycle(prev, cycleStartDay, adjustWeekend));
    } else {
      setYearMonth(prev => getNextYearMonth(prev));
    }
  };

  // Toggle single item selection
  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all currently visible filtered items
  const handleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    filtered.forEach(e => next.add(e.id));
    setSelectedIds(next);
  };

  // Clear selections
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Quick preset: Select since payday (within current cycle)
  const handleSelectSincePayday = () => {
    const next = new Set(selectedIds);
    viewExpenses.forEach(e => {
      if (e.expenseDate >= activeCycle.startDate) {
        next.add(e.id);
      }
    });
    setSelectedIds(next);
  };

  // Selected items metrics
  const selectedExpensesList = useMemo(() =>
    expenses.filter(e => selectedIds.has(e.id)),
    [expenses, selectedIds]
  );

  const selectedTotal = useMemo(() =>
    selectedExpensesList.reduce((sum, e) => sum + e.amountInCents, 0),
    [selectedExpensesList]
  );

  const selectedCategoryBreakdown = useMemo(() => {
    if (!selectedExpensesList.length) return [];
    const catTotals = getCategoryTotals(selectedExpensesList);
    return getCategoryPercentages(catTotals, selectedTotal);
  }, [selectedExpensesList, selectedTotal]);

  const handleDelete = async () => {
    await deleteExpense(deleteTarget.id);
    setDeleteTarget(null);
    setSelectedExpense(null);
    showToast('Expense deleted');
  };

  const handleRepeat = (expense) => {
    navigate('/add', { state: { repeat: expense } });
  };

  const handleEdit = (expense) => {
    navigate('/add', { state: { edit: expense } });
  };

  const totalSpentInView = viewExpenses.reduce((s, e) => s + e.amountInCents, 0);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-36 text-[#0F1424] antialiased">
      {/* Modern Frosted Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F8FAFC]/85 border-b border-black/[0.03]">
        <div className="flex justify-between items-center px-5 py-3.5 max-w-[768px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F1424] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#0F1424] tracking-tight leading-none">History</span>
              <span className="text-[10px] font-medium text-[#64748B] tracking-wide mt-0.5">Transactions</span>
            </div>
          </div>

          {/* Tally / Select Mode Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsSelectMode(prev => !prev);
              if (isSelectMode) setSelectedIds(new Set());
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-2xs ring-1 ${
              isSelectMode
                ? 'bg-[#0F1424] text-white ring-[#0F1424]'
                : 'bg-white text-[#0F1424] ring-black/[0.06] hover:bg-[#F8FAFC]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSelectMode ? 'checklist' : 'calculate'}
            </span>
            <span>{isSelectMode ? 'Tally Active' : 'Tally'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-3 pb-8 flex flex-col gap-4">
        {/* View Mode Toggle (Pay Cycle vs Calendar Month) */}
        {!isCalendarOnly && (
          <div className="flex items-center bg-white p-1 rounded-2xl ring-1 ring-black/[0.05] shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('cycle');
                setSelectedCategory('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 ${
                viewMode === 'cycle'
                  ? 'bg-[#0F1424] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F1424]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">event_repeat</span>
              Pay Cycle ({cycleStartDay}th)
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('month');
                setSelectedCategory('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 ${
                viewMode === 'month'
                  ? 'bg-[#0F1424] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F1424]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">calendar_month</span>
              Calendar Month
            </button>
          </div>
        )}

        {/* Date Period Selector Card */}
        <section className="bg-white rounded-[24px] p-5 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col items-center relative overflow-hidden">
          <div className="flex items-center justify-between w-full mb-3">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous period"
              className="w-8 h-8 text-[#64748B] hover:text-[#0F1424] transition-colors rounded-full flex items-center justify-center hover:bg-[#F8FAFC] active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="flex flex-col items-center">
              <h2 className="text-sm sm:text-base font-bold text-[#0F1424] text-center tracking-tight">
                {viewMode === 'cycle' ? activeCycle.label : formatYearMonth(yearMonth)}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next period"
              className="w-8 h-8 text-[#64748B] hover:text-[#0F1424] transition-colors rounded-full flex items-center justify-center hover:bg-[#F8FAFC] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          <div className="flex items-baseline gap-1.5 pt-2 border-t border-[#F8FAFC] w-full justify-center">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total Spent:</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#0F1424] tabular-nums tracking-tight">
              {formatCurrency(totalSpentInView)}
            </span>
          </div>
        </section>

        {/* Tally Mode Controls Bar */}
        {isSelectMode && (
          <section className="bg-indigo-50/70 border border-indigo-200/60 rounded-[20px] p-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-700">info</span>
              <span className="text-xs font-bold text-indigo-900">
                Tap transactions to tally and sum
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="bg-white text-[#0F1424] text-xs font-bold px-3 py-1.5 rounded-full ring-1 ring-black/[0.06] hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-2xs"
              >
                Select All ({filtered.length})
              </button>
              {viewMode === 'cycle' && (
                <button
                  type="button"
                  onClick={handleSelectSincePayday}
                  className="bg-white text-[#0F1424] text-xs font-bold px-3 py-1.5 rounded-full ring-1 ring-black/[0.06] hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-2xs"
                >
                  Since Payday
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
                >
                  Clear ({selectedIds.size})
                </button>
              )}
            </div>
          </section>
        )}

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search transactions, notes, or amounts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-3 bg-white ring-1 ring-black/[0.06] rounded-[20px] text-xs sm:text-sm font-medium text-[#0F1424] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F1424] shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F1424] p-0.5"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Category Filters */}
        {activeCatsInView.length > 0 && (
          <section className="-mx-5 px-5 overflow-x-auto hide-scrollbar pb-1">
            <div className="flex gap-2 w-max">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all shadow-2xs ${
                  !selectedCategory
                    ? 'bg-[#0F1424] text-white shadow-xs'
                    : 'bg-white text-[#64748B] ring-1 ring-black/[0.06] hover:bg-[#F8FAFC]'
                }`}
              >
                All
              </button>
              {activeCatsInView.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? '' : cat.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5 shadow-2xs ${
                      isSelected
                        ? 'bg-[#0F1424] text-white shadow-xs'
                        : 'bg-white text-[#64748B] ring-1 ring-black/[0.06] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Transaction List */}
        {grouped.length === 0 ? (
          <EmptyState
            emoji={searchQuery || selectedCategory ? '🔍' : '🕵️'}
            title={searchQuery || selectedCategory ? 'No expenses found' : 'No expenses in this period'}
            description={
              searchQuery
                ? `No transactions match "${searchQuery}".`
                : selectedCategory
                ? "No transactions match this category filter."
                : "Start tracking by adding your first expense."
            }
            actionLabel={!searchQuery && !selectedCategory ? '+ Add Expense' : undefined}
            onAction={!searchQuery && !selectedCategory ? () => navigate('/add') : undefined}
          />
        ) : (
          <section className="flex flex-col gap-5">
            {grouped.map(({ date, items, total }) => (
              <div key={date} className="flex flex-col gap-2.5">
                <div className="flex justify-between items-end px-1 pb-1">
                  <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    {formatExpenseDate(date, new Date())}
                  </h3>
                  <span className="text-xs font-bold text-[#64748B] tabular-nums">
                    -{formatCurrency(total)}
                  </span>
                </div>
                <div className="bg-white rounded-[24px] ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] p-2 flex flex-col divide-y divide-[#F8FAFC]">
                  {items.map(expense => (
                    <ExpenseListItem
                      key={expense.id}
                      expense={expense}
                      category={catMap[expense.categoryId]}
                      showRepeat={!isSelectMode}
                      onRepeat={() => handleRepeat(expense)}
                      onClick={() => setSelectedExpense(expense)}
                      isSelectable={isSelectMode}
                      isSelected={selectedIds.has(expense.id)}
                      onToggleSelect={toggleSelectId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Multi-Select Floating Tally Dock */}
      {isSelectMode && (
        <div className="fixed bottom-24 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
          <div className="max-w-[768px] w-full bg-[#0F1424]/95 backdrop-blur-xl text-white rounded-[26px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] pointer-events-auto ring-1 ring-white/10 flex flex-col gap-3.5">
            {/* Top row: Count, Amount, and Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">calculate</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">
                    {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight tabular-nums">
                    {formatCurrency(selectedTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#cbd5e1] hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-white text-[#0F1424] hover:bg-[#f1f5f9] transition-all active:scale-95 shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Category percentage breakdown */}
            {selectedCategoryBreakdown.length > 0 && (
              <div className="pt-2.5 border-t border-white/10 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider">
                  <span>Category Distribution</span>
                  <span>{selectedCategoryBreakdown.length} {selectedCategoryBreakdown.length === 1 ? 'category' : 'categories'}</span>
                </div>

                {/* Progress bar visualizing breakdown */}
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex p-0.5 ring-1 ring-white/5">
                  {selectedCategoryBreakdown.map((item, idx) => {
                    const colors = ['bg-[#60a5fa]', 'bg-[#34d399]', 'bg-[#fbbf24]', 'bg-[#f87171]', 'bg-[#c084fc]', 'bg-[#38bdf8]'];
                    return (
                      <div
                        key={item.categoryId}
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full rounded-full ${colors[idx % colors.length]}`}
                        title={`${catMap[item.categoryId]?.name}: ${item.percentage.toFixed(0)}%`}
                      />
                    );
                  })}
                </div>

                {/* Horizontal scroll pills with category emoji, name, percentage, and amount */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                  {selectedCategoryBreakdown.map(item => (
                    <div
                      key={item.categoryId}
                      className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full text-xs whitespace-nowrap flex-shrink-0"
                    >
                      <span>{catMap[item.categoryId]?.icon || '📦'}</span>
                      <span className="font-medium text-white">{catMap[item.categoryId]?.name}</span>
                      <span className="text-[#94A3B8] font-bold">
                        {item.percentage.toFixed(0)}%
                      </span>
                      <span className="text-[#cbd5e1] text-[11px] tabular-nums">
                        ({formatCurrency(item.total)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Detail Bottom Sheet */}
      {selectedExpense && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedExpense(null)} />
          <div className="relative w-full max-w-[768px] bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl flex flex-col gap-4 ring-1 ring-black/[0.05]">
            <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-1" />
            
            {/* Category icon + name */}
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-[18px] bg-[#F1F5F9] ring-1 ring-black/[0.04] flex items-center justify-center text-3xl shadow-2xs">
                {catMap[selectedExpense.categoryId]?.icon || '📦'}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-[#0F1424] truncate">
                  {selectedExpense.description || catMap[selectedExpense.categoryId]?.name}
                </h2>
                <p className="text-xs text-[#64748B] font-medium">
                  {catMap[selectedExpense.categoryId]?.name}
                </p>
              </div>
            </div>

            {/* Amount details card */}
            <div className="bg-[#F8FAFC] rounded-[22px] p-4 ring-1 ring-black/[0.03] flex flex-col gap-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Amount</span>
                <span className="text-xl sm:text-2xl font-black text-[#0F1424] tabular-nums tracking-tight">
                  {formatCurrency(selectedExpense.amountInCents)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[#64748B] uppercase tracking-wider">Date</span>
                <span className="font-semibold text-[#0F1424]">{selectedExpense.expenseDate}</span>
              </div>
              {selectedExpense.paymentMethod && (
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#64748B] uppercase tracking-wider">Payment</span>
                  <span className="font-semibold text-[#0F1424] capitalize">{selectedExpense.paymentMethod}</span>
                </div>
              )}
              {selectedExpense.description && (
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#64748B] uppercase tracking-wider">Note</span>
                  <span className="font-semibold text-[#0F1424]">{selectedExpense.description}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => { setSelectedExpense(null); handleRepeat(selectedExpense); }}
                className="flex-1 py-3 rounded-full bg-white ring-1 ring-black/[0.06] text-xs font-bold text-[#0F1424] hover:bg-[#F8FAFC] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Repeat
              </button>
              <button
                type="button"
                onClick={() => { setSelectedExpense(null); handleEdit(selectedExpense); }}
                className="flex-1 py-3 rounded-full bg-white ring-1 ring-black/[0.06] text-xs font-bold text-[#0F1424] hover:bg-[#F8FAFC] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedExpense)}
                className="flex-1 py-3 rounded-full bg-rose-50 ring-1 ring-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete expense?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast toast={toast} />
    </div>
  );
}
