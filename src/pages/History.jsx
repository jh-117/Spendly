import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useExpenses } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../hooks/useToast';
import {
  getDailyTotal,
  formatCurrency,
  filterByMonth,
  toYearMonth,
  formatExpenseDate,
  formatYearMonth,
  getPreviousYearMonth,
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
  const { toast, showToast } = useToast();

  const [yearMonth, setYearMonth] = useState(toYearMonth(new Date()));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currentYM = toYearMonth(new Date());

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c; });
    return m;
  }, [categories]);

  // Filter by month
  const monthExpenses = useMemo(() =>
    filterByMonth(expenses, yearMonth),
    [expenses, yearMonth]
  );

  // Filter by category
  const filtered = useMemo(() =>
    selectedCategory
      ? monthExpenses.filter(e => e.categoryId === selectedCategory)
      : monthExpenses,
    [monthExpenses, selectedCategory]
  );

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

  // Active categories in this month
  const activeCatsInMonth = useMemo(() => {
    const ids = new Set(monthExpenses.map(e => e.categoryId));
    return categories.filter(c => ids.has(c.id) && c.isActive);
  }, [monthExpenses, categories]);

  const canGoNext = yearMonth < currentYM;

  const handleDelete = () => {
    deleteExpense(deleteTarget.id);
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

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 text-[#1a1c1c] antialiased">
      {/* Header */}
      <header className="bg-[#f9f9f9] w-full top-0 sticky z-40">
        <div className="flex justify-between items-center px-5 py-4 max-w-[768px] mx-auto">
          <div className="w-10 h-10 rounded-full bg-[#eeeeee] flex items-center justify-center overflow-hidden">
            <img src="https://i.pravatar.cc/150?img=47" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-headline-lg-mobile font-bold text-[#181d3a]">Spendly</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-2 pb-8 flex flex-col gap-6">
        {/* Month Selector */}
        <section className="flex flex-col items-center bg-white rounded-2xl p-6 border border-[#e2e2e2] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#181d3a]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setYearMonth(getPreviousYearMonth(yearMonth))}
              className="p-2 text-[#64748B] hover:text-[#181d3a] transition-colors rounded-full hover:bg-[#f3f3f3] active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <h2 className="text-headline-lg-mobile font-bold text-[#181d3a]">
              {formatYearMonth(yearMonth)}
            </h2>
            <button
              onClick={() => canGoNext && setYearMonth(getNextYearMonth(yearMonth))}
              disabled={!canGoNext}
              className="p-2 text-[#64748B] hover:text-[#181d3a] transition-colors rounded-full hover:bg-[#f3f3f3] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
          <p className="text-body-sm text-[#64748B]">
            Total Spent: <span className="font-semibold text-[#1a1c1c]">
              {formatCurrency(monthExpenses.reduce((s, e) => s + e.amountInCents, 0))}
            </span>
          </p>
        </section>

        {/* Category Filters */}
        {activeCatsInMonth.length > 0 && (
          <section className="-mx-5 px-5 overflow-x-auto hide-scrollbar pb-2">
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
              {activeCatsInMonth.map(cat => (
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
            emoji={selectedCategory ? '🔍' : '🕵️'}
            title={selectedCategory ? 'No expenses found' : 'No expenses this month'}
            description={
              selectedCategory
                ? "No transactions match this category filter."
                : "Start tracking by adding your first expense."
            }
            actionLabel={!selectedCategory ? '+ Add Expense' : undefined}
            onAction={!selectedCategory ? () => navigate('/add') : undefined}
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
                      showRepeat
                      onRepeat={() => handleRepeat(expense)}
                      onClick={() => setSelectedExpense(expense)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

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
