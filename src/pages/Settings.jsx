import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudget } from '../hooks/useBudget';
import { useSettings } from '../hooks/useSettings';
import { useExpenses } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useRecurringExpenses } from '../hooks/useRecurringExpenses';
import { useToast } from '../hooks/useToast';
import { validateBudget, validateAmount } from '../lib/validation';
import { fromCents, toCents, formatCurrency } from '../lib/calculations';
import { exportExpensesToCSV } from '../lib/export';
import { PAYMENT_METHODS } from '../lib/constants';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';

export default function Settings() {
  const navigate = useNavigate();
  const { budget, setBudget } = useBudget();
  const { settings, updateSettings } = useSettings();
  const { expenses, deleteExpense, clearAllExpenses } = useExpenses();
  const { categories, resetCategories } = useCategories();
  const {
    recurringExpenses,
    addRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringExpense,
  } = useRecurringExpenses();
  const { toast, showToast } = useToast();

  const [budgetInput, setBudgetInput] = useState(
    budget?.amountInCents ? fromCents(budget.amountInCents) : ''
  );

  useEffect(() => {
    if (budget?.amountInCents != null) {
      setBudgetInput(fromCents(budget.amountInCents));
    }
  }, [budget?.amountInCents]);
  const [budgetError, setBudgetError] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState(null);

  // Recurring form state
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('bills');
  const [recDay, setRecDay] = useState(1);
  const [recPayment, setRecPayment] = useState('debit');
  const [recError, setRecError] = useState('');

  const catMap = categories.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const handleAddRecurring = async () => {
    if (!recDesc.trim()) {
      setRecError('Please enter a description');
      return;
    }
    const valResult = validateAmount(recAmount);
    if (!valResult.valid) {
      setRecError(valResult.error);
      return;
    }
    setRecError('');
    await addRecurringExpense({
      amountInCents: toCents(recAmount),
      categoryId: recCategory,
      description: recDesc.trim(),
      paymentMethod: recPayment,
      dayOfMonth: recDay,
    });
    setRecDesc('');
    setRecAmount('');
    setShowRecurringForm(false);
    showToast('Recurring expense added ✓');
  };

  const handleDeleteRecurringClick = (item) => {
    const matching = expenses.filter(
      e => e.description === `${item.description} (Recurring)` ||
           e.description === item.description
    );
    setDeleteRecurringTarget({ item, matching });
  };

  const handleConfirmDeleteRecurring = async () => {
    if (!deleteRecurringTarget) return;
    const { item, matching } = deleteRecurringTarget;
    await deleteRecurringExpense(item.id);
    if (matching && matching.length > 0) {
      for (const exp of matching) {
        await deleteExpense(exp.id);
      }
    }
    setDeleteRecurringTarget(null);
    showToast(
      matching && matching.length > 0
        ? `Deleted "${item.description}" and removed from expenses`
        : `Deleted "${item.description}"`
    );
  };

  const handleSaveBudget = () => {
    const result = validateBudget(budgetInput);
    if (!result.valid) { setBudgetError(result.error); return; }
    setBudgetError('');
    setBudget(budgetInput.replace(/,/g, ''));
    showToast('Budget saved ✓');
  };

  const handleClearAll = async () => {
    await clearAllExpenses();
    await resetCategories();
    setShowClearDialog(false);
    showToast('All data cleared');
    setTimeout(() => navigate('/'), 500);
  };

  const handleExport = () => {
    if (!expenses.length) { showToast('No expenses to export'); return; }
    exportExpensesToCSV(expenses, categories);
    showToast('CSV downloaded ✓');
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#1a1c1c] antialiased">
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

      <main className="w-full max-w-[768px] mx-auto px-5 pb-32 pt-2 flex flex-col gap-6">
        {/* Title */}
        <div className="mb-2">
          <h2 className="text-display-hero text-[#181d3a]">Settings</h2>
        </div>

        {/* Profile */}
        <section className="bg-white rounded-2xl p-6 border border-[#e2e2e2] flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#f3f3f3] flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="https://i.pravatar.cc/150?img=47" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h3 className="text-headline-lg-mobile text-[#181d3a]">Jiahuey</h3>
            <p className="text-body-sm text-[#64748B]">Personal Account</p>
          </div>
        </section>

        {/* General */}
        <section className="bg-white rounded-2xl p-6 border border-[#e2e2e2] flex flex-col gap-6">
          <h3 className="text-label-caps text-[#64748B] uppercase">General</h3>
          {/* Currency — disabled */}
          <div className="flex justify-between items-center">
            <span className="text-body-md text-[#1a1c1c]">Currency</span>
            <div className="flex items-center gap-2 text-[#64748B] bg-[#f3f3f3] px-3 py-1.5 rounded-lg cursor-not-allowed">
              <span className="text-body-md">MYR</span>
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
          </div>
          {/* Monthly Budget */}
          <div className="flex flex-col gap-3">
            <label className="text-body-md text-[#1a1c1c]">Monthly Budget</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 border-b border-[#e2e2e2] pb-2 focus-within:border-[#181d3a] transition-colors">
                <span className="text-[#64748B] mr-1 text-body-md">RM</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={budgetInput}
                  onChange={e => { setBudgetInput(e.target.value); setBudgetError(''); }}
                  placeholder="0"
                  className="w-2/3 bg-transparent border-none focus:ring-0 p-0 text-[32px] text-[#181d3a] font-semibold outline-none"
                />
              </div>
              <button
                onClick={handleSaveBudget}
                className="bg-[#181d3a] text-white text-body-sm px-6 py-3 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                Save
              </button>
            </div>
            {budgetError && <p className="text-[#ba1a1a] text-body-sm">{budgetError}</p>}
          </div>

          {/* Salary & Billing Cycle */}
          <div className="flex flex-col gap-3 pt-4 border-t border-[#f3f3f3]">
            <div className="flex justify-between items-center gap-4">
              <div>
                <label className="text-body-md text-[#1a1c1c] font-medium block">Salary / Cycle Start Day</label>
                <span className="text-body-sm text-[#64748B] block mt-0.5">
                  {settings.cycleStartDay === 1
                    ? 'Tracks by standard calendar month (1st – End)'
                    : `Tracks from ${settings.cycleStartDay}th to ${settings.cycleStartDay - 1}th of following month`}
                </span>
              </div>
              <select
                value={settings.cycleStartDay ?? 25}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  updateSettings({ cycleStartDay: val });
                  showToast(`Cycle updated to day ${val} ✓`);
                }}
                className="bg-[#f3f3f3] border-none rounded-xl text-body-md font-semibold text-[#181d3a] px-3.5 py-2.5 focus:ring-1 focus:ring-[#181d3a] outline-none cursor-pointer flex-shrink-0"
              >
                <option value={1}>1st (Calendar Month)</option>
                {Array.from({ length: 27 }, (_, i) => i + 2).map(day => (
                  <option key={day} value={day}>
                    {day}th {day === 25 ? '★ (Salary Day)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {settings.cycleStartDay !== 1 && (
              <div className="flex justify-between items-center bg-[#f8fafc] p-3 rounded-xl border border-[#e2e2e2]">
                <div>
                  <span className="text-body-sm text-[#1a1c1c] font-medium block">
                    Weekend Payday Adjustment
                  </span>
                  <span className="text-[11px] text-[#64748B] block mt-0.5">
                    If {settings.cycleStartDay ?? 25}th falls on Sat/Sun, shift cycle start to Friday (e.g. 23 Oct)
                  </span>
                </div>
                <button
                  onClick={() => {
                    const newVal = settings.adjustWeekendPayday === false ? true : false;
                    updateSettings({ adjustWeekendPayday: newVal });
                    showToast(newVal ? 'Weekend adjustment enabled ✓' : 'Weekend adjustment disabled');
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 ${
                    settings.adjustWeekendPayday !== false ? 'bg-[#181d3a]' : 'bg-[#e2e2e2]'
                  }`}
                >
                  <span
                    className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                      settings.adjustWeekendPayday !== false ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            <p className="text-[12px] text-[#64748B] bg-[#f8fafc] p-3 rounded-xl border border-[#e2e2e2] leading-relaxed">
              💡 <strong>Accurate Safe-to-Spend:</strong> When your salary arrives on the 25th, your budget and daily pace will automatically calculate until your next payday instead of the calendar month end.
            </p>
          </div>
        </section>

        {/* Daily Check-in */}
        <section className="bg-white rounded-2xl p-6 border border-[#e2e2e2] flex flex-col gap-4">
          <h3 className="text-label-caps text-[#64748B] uppercase">Daily Check-in</h3>
          <div className="flex justify-between items-center gap-4">
            <div>
              <span className="text-body-md text-[#1a1c1c] font-medium block">Check-in Reminder</span>
              <span className="text-body-sm text-[#64748B] block mt-0.5">
                Get prompted to log expenses when you open the app after your set time.
              </span>
            </div>
            <button
              onClick={() => {
                const newVal = !settings.reminderEnabled;
                updateSettings({ reminderEnabled: newVal });
                showToast(newVal ? 'Check-in enabled ✓' : 'Check-in disabled');
              }}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 ${
                settings.reminderEnabled ? 'bg-[#181d3a]' : 'bg-[#e2e2e2]'
              }`}
            >
              <span
                className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  settings.reminderEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.reminderEnabled && (
            <>
              <div className="flex justify-between items-center pt-3 border-t border-[#f3f3f3]">
                <span className="text-body-sm text-[#1a1c1c] font-medium">Reminder Time</span>
                <input
                  type="time"
                  value={settings.reminderTime || '21:00'}
                  onChange={e => {
                    updateSettings({ reminderTime: e.target.value });
                    showToast('Reminder time updated ✓');
                  }}
                  className="bg-[#f3f3f3] border-none rounded-xl text-body-md font-semibold text-[#181d3a] px-3.5 py-2 focus:ring-1 focus:ring-[#181d3a] outline-none cursor-pointer"
                />
              </div>

              <p className="text-[12px] text-[#64748B] bg-[#f8fafc] p-3 rounded-xl border border-[#e2e2e2] leading-relaxed">
                💡 <strong>App-open check:</strong> This prompts you when you open Spendly after your set time — not a background push notification. Open the app daily to keep your streak!
              </p>
            </>
          )}
        </section>

        {/* Recurring & Fixed Expenses */}
        <section className="bg-white rounded-2xl p-6 border border-[#e2e2e2] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-label-caps text-[#64748B] uppercase">Recurring & Fixed Expenses</h3>
              <p className="text-body-sm text-[#64748B] mt-0.5">Auto-records subscriptions and bills on due day</p>
            </div>
            {!showRecurringForm && (
              <button
                onClick={() => { setShowRecurringForm(true); setRecError(''); }}
                className="bg-[#181d3a] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 active:scale-95 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add
              </button>
            )}
          </div>

          {/* Inline Add Recurring Form */}
          {showRecurringForm && (
            <div className="bg-[#F8FAFC] border border-[#e2e2e2] rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs font-bold text-[#181d3a] uppercase">New Recurring Expense</span>

              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="e.g. Netflix, Spotify, Rent"
                  value={recDesc}
                  onChange={e => setRecDesc(e.target.value)}
                  className="bg-white border border-[#cbd5e1] rounded-lg px-3 py-2 text-body-sm text-[#1a1c1c] focus:outline-none focus:border-[#181d3a]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5 bg-white border border-[#cbd5e1] rounded-lg px-3 py-2">
                  <span className="text-xs text-[#64748B] font-semibold">RM</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={recAmount}
                    onChange={e => setRecAmount(e.target.value)}
                    className="w-full text-body-sm text-[#181d3a] font-semibold bg-transparent border-none outline-none"
                  />
                </div>

                <select
                  value={recCategory}
                  onChange={e => setRecCategory(e.target.value)}
                  className="bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-2 text-body-sm text-[#1a1c1c] outline-none"
                >
                  {categories.filter(c => c.isActive).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#64748B]">Due day of month</span>
                  <select
                    value={recDay}
                    onChange={e => setRecDay(parseInt(e.target.value, 10))}
                    className="bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-2 text-body-sm text-[#1a1c1c] outline-none"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>
                        Day {d} of month
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#64748B]">Payment method</span>
                  <select
                    value={recPayment}
                    onChange={e => setRecPayment(e.target.value)}
                    className="bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-2 text-body-sm text-[#1a1c1c] outline-none"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {recError && <p className="text-[#ba1a1a] text-xs">{recError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowRecurringForm(false)}
                  className="flex-1 py-2 text-xs font-semibold text-[#64748B] bg-white border border-[#cbd5e1] rounded-lg hover:bg-[#f3f3f3]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRecurring}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#181d3a] rounded-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  Save Recurring
                </button>
              </div>
            </div>
          )}

          {/* List of Recurring Expenses */}
          {recurringExpenses.length === 0 ? (
            <p className="text-body-sm text-[#64748B] italic py-2 text-center bg-[#f8fafc] rounded-xl border border-dashed border-[#cbd5e1]">
              No recurring expenses set up yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recurringExpenses.map(item => {
                const cat = catMap[item.categoryId];
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      item.isActive
                        ? 'bg-white border-[#e2e2e2]'
                        : 'bg-[#f8fafc] border-[#e2e2e2] opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f3f3f3] flex items-center justify-center text-xl flex-shrink-0">
                        {cat?.icon || '🔁'}
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-[#1a1c1c] leading-tight">
                          {item.description}
                        </h4>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          Day {item.dayOfMonth} each month • {cat?.name || 'General'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-body-md font-bold text-[#181d3a]">
                        {formatCurrency(item.amountInCents)}
                      </span>
                      <button
                        onClick={() => toggleRecurringExpense(item.id)}
                        className={`w-9 h-5 rounded-full transition-colors relative flex items-center flex-shrink-0 ${
                          item.isActive ? 'bg-[#181d3a]' : 'bg-[#cbd5e1]'
                        }`}
                        title={item.isActive ? 'Active' : 'Paused'}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            item.isActive ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleDeleteRecurringClick(item)}
                        className="text-[#94a3b8] hover:text-[#ba1a1a] transition-colors p-1"
                        title="Delete recurring item"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Manage Categories */}
        <section className="bg-white rounded-2xl p-6 border border-[#e2e2e2]">
          <button
            onClick={() => navigate('/categories')}
            className="flex justify-between items-center w-full group active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#dee1ff]/50 text-[#181d3a] flex items-center justify-center">
                <span className="material-symbols-outlined">category</span>
              </div>
              <span className="text-body-md text-[#1a1c1c] font-medium">Manage Categories</span>
            </div>
            <span className="material-symbols-outlined text-[#64748B] group-hover:text-[#181d3a] transition-colors">chevron_right</span>
          </button>
        </section>

        {/* Data & Privacy */}
        <section className="bg-white rounded-2xl p-6 border border-[#e2e2e2] flex flex-col gap-4">
          <h3 className="text-label-caps text-[#64748B] uppercase">Data & Privacy</h3>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 border border-[#77767e] text-[#181d3a] font-semibold text-body-md py-3.5 rounded-full hover:bg-[#f3f3f3] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            Export CSV
          </button>
          <button
            onClick={() => setShowClearDialog(true)}
            className="w-full flex items-center justify-center gap-2 border border-[#ffdad6] text-[#ba1a1a] bg-[#ffdad6]/20 font-semibold text-body-md py-3.5 rounded-full hover:bg-[#ffdad6]/40 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            Clear All Data
          </button>
        </section>
      </main>

      <ConfirmDialog
        isOpen={showClearDialog}
        title="Clear all data?"
        message="This will permanently delete all your expenses, categories, and settings. This cannot be undone."
        confirmLabel="Clear Everything"
        cancelLabel="Cancel"
        destructive
        requireTyping="DELETE"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearDialog(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteRecurringTarget}
        title="Delete Recurring Expense"
        message={
          deleteRecurringTarget?.matching?.length > 0
            ? `Delete recurring "${deleteRecurringTarget.item.description}"? This will also remove the ${deleteRecurringTarget.matching.length} recorded transaction(s) generated by it from your expense history.`
            : `Are you sure you want to delete "${deleteRecurringTarget?.item?.description}"? Future auto-logging for this item will stop.`
        }
        confirmLabel={deleteRecurringTarget?.matching?.length > 0 ? "Delete & Clear Expenses" : "Delete"}
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmDeleteRecurring}
        onCancel={() => setDeleteRecurringTarget(null)}
      />

      <Toast toast={toast} />
    </div>
  );
}
