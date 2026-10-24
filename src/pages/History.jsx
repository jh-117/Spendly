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
  const isCalendarOnly = cycleStartDay === 1;

  // View mode: 'cycle' or 'month'
  const [viewMode, setViewMode] = useState(isCalendarOnly ? 'month' : 'cycle');

  // Month navigation
  const currentYM = toYearMonth(new Date());
  const [yearMonth, setYearMonth] = useState(currentYM);

  // Cycle navigation
  const currentCycle = useMemo(() => getBillingCycle(new Date(), cycleStartDay), [cycleStartDay]);
  const [activeCycle, setActiveCycle] = useState(() => getBillingCycle(new Date(), cycleStartDay));

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
      setActiveCycle(prev => getPreviousCycle(prev, cycleStartDay));
    } else {
      setYearMonth(prev => getPreviousYearMonth(prev));
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (viewMode === 'cycle') {
      setActiveCycle(prev => getNextCycle(prev, cycleStartDay));
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
    <div className="bg-[#F8FAFC] min-h-screen pb-36 text-[#1a1c1c] antialiased">
      {/* Header */}
      <header className="bg-[#f9f9f9] w-full top-0 sticky z-40">
        <div className="flex justify-between items-center px-5 py-4 max-w-[768px] mx-auto">
          <div className="w-10 h-10 rounded-full bg-[#eeeeee] flex items-center justify-center overflow-hidden">
            <img src="https://i.pravatar.cc/150?img=47" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-headline-lg-mobile font-bold text-[#181d3a]">Spendly</h1>
          {/* Tally / Select Mode Toggle Button */}
          <button
            onClick={() => {
              setIsSelectMode(prev => !prev);
              if (isSelectMode) setSelectedIds(new Set());
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              isSelectMode
                ? 'bg-[#181d3a] text-white shadow-sm ring-2 ring-[#dee1ff]'
                : 'bg-[#dee1ff]/60 text-[#181d3a] hover:bg-[#dee1ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isSelectMode ? 'checklist' : 'calculate'}
            </span>
            <span>{isSelectMode ? 'Tally Active' : 'Tally'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-2 pb-8 flex flex-col gap-5">
        {/* View Mode Toggle (Pay Cycle vs Calendar Month) */}
        {!isCalendarOnly && (
          <div className="flex justify-between items-center bg-white p-1.5 rounded-xl border border-[#e2e2e2] shadow-xs">
            <button
              onClick={() => {
                setViewMode('cycle');
                setSelectedCategory('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                viewMode === 'cycle'
                  ? 'bg-[#181d3a] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#181d3a]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">event_repeat</span>
              Pay Cycle ({cycleStartDay}th)
            </button>
            <button
              onClick={() => {
                setViewMode('month');
                setSelectedCategory('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-[#181d3a] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#181d3a]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">calendar_month</span>
              Calendar Month
            </button>
          </div>
        )}

        {/* Date Period Selector Card */}
        <section className="flex flex-col items-center bg-white rounded-2xl p-6 border border-[#e2e2e2] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#181d3a]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={handlePrev}
              className="p-2 text-[#64748B] hover:text-[#181d3a] transition-colors rounded-full hover:bg-[#f3f3f3] active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <h2 className="text-headline-lg-mobile font-bold text-[#181d3a] text-center">
              {viewMode === 'cycle' ? activeCycle.label : formatYearMonth(yearMonth)}
            </h2>
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="p-2 text-[#64748B] hover:text-[#181d3a] transition-colors rounded-full hover:bg-[#f3f3f3] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
          <p className="text-body-sm text-[#64748B]">
            Total Spent:{' '}
            <span className="font-semibold text-[#1a1c1c]">
              {formatCurrency(totalSpentInView)}
            </span>
          </p>
        </section>

        {/* Tally Mode Controls Bar */}
        {isSelectMode && (
          <section className="bg-[#dee1ff]/40 border border-[#dee1ff] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#181d3a]">info</span>
              <span className="text-xs font-semibold text-[#181d3a]">
                Tap any expense to select and tally
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSelectAllVisible}
                className="bg-white text-[#181d3a] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#cbd5e1] hover:bg-[#f8fafc] active:scale-95 transition-all"
              >
                Select All ({filtered.length})
              </button>
              {viewMode === 'cycle' && (
                <button
                  onClick={handleSelectSincePayday}
                  className="bg-white text-[#181d3a] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#cbd5e1] hover:bg-[#f8fafc] active:scale-95 transition-all"
                >
                  Since Payday ({activeCycle.shortLabel.split('–')[0].trim()})
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="text-xs font-semibold text-[#ba1a1a] hover:underline px-2 py-1"
                >
                  Clear ({selectedIds.size})
                </button>
              )}
            </div>
          </section>
        )}

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search description, category, or amount..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#e2e2e2] rounded-xl text-body-sm text-[#1a1c1c] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#181d3a] shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1a1c1c] p-0.5"
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
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-lg text-body-sm font-semibold whitespace-nowrap active:scale-95 transition-transform ${
                  !selectedCategory
                    ? 'bg-[#181d3a] text-white shadow-[0_2px_8px_rgba(24,29,58,0.15)]'
                    : 'bg-white text-[#64748B] border border-[#e2e2e2] hover:bg-[#f3f3f3]'
                }`}
              >
                All
              </button>
              {activeCatsInView.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
                  className={`px-4 py-2 rounded-lg text-body-sm whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-[#181d3a] text-white font-semibold'
                      : 'bg-white text-[#64748B] border border-[#e2e2e2] hover:bg-[#f3f3f3]'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
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
          <section className="flex flex-col gap-6">
            {grouped.map(({ date, items, total }) => (
              <div key={date} className="flex flex-col gap-3">
                <div className="flex justify-between items-end px-1 border-b border-[#e2e2e2] pb-2">
                  <h3 className="text-body-sm font-semibold text-[#64748B] uppercase tracking-wider">
                    {formatExpenseDate(date, new Date())}
                  </h3>
                  <span className="text-body-sm text-[#64748B]">
                    -{formatCurrency(total)}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-[#e2e2e2] p-2 flex flex-col gap-1">
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
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
          <div className="max-w-[768px] w-full bg-[#181d3a] text-white rounded-2xl p-4 shadow-2xl pointer-events-auto border border-[#333857] flex flex-col gap-3">
            {/* Top row: Count, Amount, and Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">calculate</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#cbd5e1] font-medium uppercase tracking-wider block">
                    {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
                  </span>
                  <span className="text-headline-lg-mobile font-bold text-white tracking-tight">
                    {formatCurrency(selectedTotal)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#cbd5e1] hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-[#181d3a] hover:bg-[#f1f5f9] transition-all active:scale-95 shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Category percentage breakdown */}
            {selectedCategoryBreakdown.length > 0 && (
              <div className="pt-2.5 border-t border-white/10 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[11px] text-[#94a3b8]">
                  <span>Category Breakdown</span>
                  <span>{selectedCategoryBreakdown.length} {selectedCategoryBreakdown.length === 1 ? 'category' : 'categories'}</span>
                </div>

                {/* Progress bar visualizing breakdown */}
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                  {selectedCategoryBreakdown.map((item, idx) => {
                    const colors = ['bg-[#60a5fa]', 'bg-[#34d399]', 'bg-[#fbbf24]', 'bg-[#f87171]', 'bg-[#c084fc]', 'bg-[#38bdf8]'];
                    return (
                      <div
                        key={item.categoryId}
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full ${colors[idx % colors.length]}`}
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
                      className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap flex-shrink-0"
                    >
                      <span>{catMap[item.categoryId]?.icon || '📦'}</span>
                      <span className="font-medium text-white">{catMap[item.categoryId]?.name}</span>
                      <span className="text-[#94a3b8] font-bold">
                        {item.percentage.toFixed(0)}%
                      </span>
                      <span className="text-[#cbd5e1] text-[11px]">
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

      {/* Expense Detail Sheet */}
      {selectedExpense && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedExpense(null)} />
          <div className="relative w-full max-w-[768px] bg-white rounded-t-3xl p-6 pb-10 shadow-2xl flex flex-col gap-4">
            <div className="w-10 h-1 bg-[#e2e2e2] rounded-full mx-auto mb-2" />
            {/* Category icon + name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#eeeeee] flex items-center justify-center text-4xl">
                {catMap[selectedExpense.categoryId]?.icon || '📦'}
              </div>
              <div>
                <h2 className="text-headline-lg-mobile font-semibold text-[#1a1c1c]">
                  {selectedExpense.description || catMap[selectedExpense.categoryId]?.name}
                </h2>
                <p className="text-body-sm text-[#64748B]">
                  {catMap[selectedExpense.categoryId]?.name}
                </p>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-[#F8FAFC] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-label-caps text-[#64748B] uppercase">Amount</span>
                <span className="text-headline-lg-mobile font-semibold text-[#181d3a]">
                  {formatCurrency(selectedExpense.amountInCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-caps text-[#64748B] uppercase">Date</span>
                <span className="text-body-sm text-[#1a1c1c]">{selectedExpense.expenseDate}</span>
              </div>
              {selectedExpense.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-label-caps text-[#64748B] uppercase">Payment</span>
                  <span className="text-body-sm text-[#1a1c1c] capitalize">{selectedExpense.paymentMethod}</span>
                </div>
              )}
              {selectedExpense.description && (
                <div className="flex justify-between">
                  <span className="text-label-caps text-[#64748B] uppercase">Note</span>
                  <span className="text-body-sm text-[#1a1c1c]">{selectedExpense.description}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setSelectedExpense(null); handleRepeat(selectedExpense); }}
                className="flex-1 py-3 rounded-full border border-[#e2e2e2] text-body-md text-[#46464d] font-semibold hover:bg-[#f3f3f3] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Repeat
              </button>
              <button
                onClick={() => { setSelectedExpense(null); handleEdit(selectedExpense); }}
                className="flex-1 py-3 rounded-full border border-[#e2e2e2] text-body-md text-[#46464d] font-semibold hover:bg-[#f3f3f3] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
              <button
                onClick={() => setDeleteTarget(selectedExpense)}
                className="flex-1 py-3 rounded-full border border-[#ffdad6] bg-[#ffdad6]/30 text-[#ba1a1a] font-semibold text-body-md hover:bg-[#ffdad6]/60 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
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
