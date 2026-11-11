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
    updateRecurringExpense,
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
  const [editingRecurringId, setEditingRecurringId] = useState(null);
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

  const handleStartEditRecurring = (item) => {
    setEditingRecurringId(item.id);
    setRecDesc(item.description);
    setRecAmount(fromCents(item.amountInCents));
    setRecCategory(item.categoryId);
    setRecDay(item.dayOfMonth);
    setRecPayment(item.paymentMethod || 'debit');
    setRecError('');
    setShowRecurringForm(true);
  };

  const handleCancelRecurringForm = () => {
    setShowRecurringForm(false);
    setEditingRecurringId(null);
    setRecDesc('');
    setRecAmount('');
    setRecDay(1);
    setRecPayment('debit');
    setRecError('');
  };

  const handleSaveRecurring = async () => {
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

    if (editingRecurringId) {
      await updateRecurringExpense(editingRecurringId, {
        amountInCents: toCents(recAmount),
        categoryId: recCategory,
        description: recDesc.trim(),
        paymentMethod: recPayment,
        dayOfMonth: recDay,
      });
      showToast('Recurring expense updated ✓');
    } else {
      await addRecurringExpense({
        amountInCents: toCents(recAmount),
        categoryId: recCategory,
        description: recDesc.trim(),
        paymentMethod: recPayment,
        dayOfMonth: recDay,
      });
      showToast('Recurring expense added ✓');
    }

    handleCancelRecurringForm();
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
    <div className="bg-[#F8FAFC] min-h-screen text-[#0F1424] antialiased">
      {/* Modern Frosted Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F8FAFC]/85 border-b border-black/[0.03]">
        <div className="flex justify-between items-center px-5 py-3.5 max-w-[768px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F1424] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#0F1424] tracking-tight leading-none">Settings</span>
              <span className="text-[10px] font-medium text-[#64748B] tracking-wide mt-0.5">Preferences & Data</span>
            </div>
          </div>
          <div className="w-8" />
        </div>
      </header>

      <main className="w-full max-w-[768px] mx-auto px-5 pb-36 pt-3 flex flex-col gap-5">
        {/* Profile Card */}
        <section className="bg-white rounded-[24px] p-5 ring-1 ring-black/[0.05] shadow-2xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0F1424] text-white flex items-center justify-center font-bold text-xl ring-1 ring-white/10 shadow-sm flex-shrink-0">
            J
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#0F1424] tracking-tight truncate">Jiahuey</h3>
            <p className="text-xs text-[#64748B] font-medium">Personal Finance Ledger</p>
          </div>
        </section>

        {/* General */}
        <section className="bg-white rounded-[26px] p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col gap-6">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">General</h3>
          
          {/* Currency — disabled */}
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-bold text-[#0F1424] block">Base Currency</span>
              <span className="text-xs text-[#64748B]">Default currency used for all records</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#64748B] bg-[#F1F5F9] px-3 py-1.5 rounded-full ring-1 ring-black/[0.04] cursor-not-allowed">
              <span className="text-xs font-bold text-[#0F1424]">MYR</span>
              <span className="material-symbols-outlined text-[15px]">lock</span>
            </div>
          </div>

          {/* Monthly Budget */}
          <div className="flex flex-col gap-3 pt-4 border-t border-[#F8FAFC]">
            <label className="text-sm font-bold text-[#0F1424]">Monthly Budget Limit</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-baseline gap-1.5 bg-[#F8FAFC] rounded-2xl px-4 py-2 ring-1 ring-black/[0.05] focus-within:ring-2 focus-within:ring-[#0F1424] transition-all">
                <span className="text-xs font-bold text-[#64748B]">RM</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={budgetInput}
                  onChange={e => { setBudgetInput(e.target.value); setBudgetError(''); }}
                  placeholder="0.00"
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl sm:text-2xl text-[#0F1424] font-bold outline-none tabular-nums"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveBudget}
                className="bg-[#0F1424] text-white text-xs font-bold px-5 py-3 rounded-xl hover:bg-[#181D3A] active:scale-95 transition-all shadow-xs"
              >
                Save
              </button>
            </div>
            {budgetError && <p className="text-rose-600 text-xs font-semibold">{budgetError}</p>}
          </div>

          {/* Salary & Billing Cycle */}
          <div className="flex flex-col gap-3 pt-4 border-t border-[#F8FAFC]">
            <div className="flex justify-between items-center gap-4">
              <div>
                <label className="text-sm font-bold text-[#0F1424] block">Salary / Cycle Start Day</label>
                <span className="text-xs text-[#64748B] block mt-0.5">
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
                className="bg-[#F8FAFC] ring-1 ring-black/[0.08] rounded-xl text-sm font-semibold text-[#0F1424] px-3.5 py-2.5 focus:ring-2 focus:ring-[#0F1424] outline-none cursor-pointer flex-shrink-0"
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
              <div className="flex justify-between items-center bg-[#F8FAFC] p-3.5 rounded-2xl ring-1 ring-black/[0.04]">
                <div>
                  <span className="text-sm font-semibold text-[#0F1424] block">
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
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 p-0.5 ${
                    settings.adjustWeekendPayday !== false ? 'bg-[#0F1424]' : 'bg-[#E2E8F0]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                      settings.adjustWeekendPayday !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            <p className="text-[12px] text-[#64748B] bg-[#F8FAFC] p-3.5 rounded-2xl ring-1 ring-black/[0.04] leading-relaxed">
              💡 <strong>Accurate Safe-to-Spend:</strong> When your salary arrives on the 25th, your budget and daily pace will automatically calculate until your next payday instead of the calendar month end.
            </p>
          </div>
        </section>

        {/* Daily Check-in */}
        <section className="bg-white rounded-[26px] p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Daily Check-in</h3>
          <div className="flex justify-between items-center gap-4">
            <div>
              <span className="text-sm font-bold text-[#0F1424] block">Check-in Reminder</span>
              <span className="text-xs text-[#64748B] block mt-0.5">
                Get prompted to log expenses when you open the app after your set time.
              </span>
            </div>
            <button
              onClick={() => {
                const newVal = !settings.reminderEnabled;
                updateSettings({ reminderEnabled: newVal });
                showToast(newVal ? 'Check-in enabled ✓' : 'Check-in disabled');
              }}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 p-0.5 ${
                settings.reminderEnabled ? 'bg-[#0F1424]' : 'bg-[#E2E8F0]'
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                  settings.reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.reminderEnabled && (
            <>
              <div className="flex justify-between items-center pt-3 border-t border-black/[0.04]">
                <span className="text-xs font-semibold text-[#0F1424]">Reminder Time</span>
                <input
                  type="time"
                  value={settings.reminderTime || '21:00'}
                  onChange={e => {
                    updateSettings({ reminderTime: e.target.value });
                    showToast('Reminder time updated ✓');
                  }}
                  className="bg-[#F8FAFC] ring-1 ring-black/[0.08] rounded-xl text-sm font-semibold text-[#0F1424] px-3.5 py-2 focus:ring-2 focus:ring-[#0F1424] outline-none cursor-pointer"
                />
              </div>

              <p className="text-[12px] text-[#64748B] bg-[#F8FAFC] p-3.5 rounded-2xl ring-1 ring-black/[0.04] leading-relaxed">
                💡 <strong>App-open check:</strong> This prompts you when you open Spendly after your set time — not a background push notification. Open the app daily to keep your streak!
              </p>
            </>
          )}
        </section>

        {/* Recurring & Fixed Expenses */}
        <section className="bg-white rounded-[26px] p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Recurring & Fixed Expenses</h3>
              <p className="text-xs text-[#64748B] mt-0.5">Auto-records subscriptions and bills on due day</p>
            </div>
            {!showRecurringForm && (
              <button
                type="button"
                onClick={() => {
                  setEditingRecurringId(null);
                  setRecDesc('');
                  setRecAmount('');
                  setRecCategory('bills');
                  setRecDay(1);
                  setRecPayment('debit');
                  setRecError('');
                  setShowRecurringForm(true);
                }}
                className="bg-[#0F1424] text-white text-xs font-bold px-3.5 py-1.5 rounded-full hover:bg-[#181D3A] active:scale-95 transition-all flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add
              </button>
            )}
          </div>

          {/* Inline Add/Edit Recurring Form */}
          {showRecurringForm && (
            <div className="bg-[#F8FAFC] ring-1 ring-black/[0.06] rounded-[20px] p-4 flex flex-col gap-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F1424] uppercase tracking-wider">
                  {editingRecurringId ? 'Edit Recurring Expense' : 'New Recurring Expense'}
                </span>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {editingRecurringId ? 'Editing' : 'Auto-log'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="e.g. Netflix, Spotify, Rent"
                  value={recDesc}
                  onChange={e => setRecDesc(e.target.value)}
                  className="bg-white ring-1 ring-black/[0.06] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#0F1424] focus:outline-none focus:ring-2 focus:ring-[#0F1424]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5 bg-white ring-1 ring-black/[0.06] rounded-xl px-3.5 py-2">
                  <span className="text-xs text-[#64748B] font-bold">RM</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={recAmount}
                    onChange={e => setRecAmount(e.target.value)}
                    className="w-full text-xs sm:text-sm text-[#0F1424] font-bold bg-transparent border-none outline-none tabular-nums"
                  />
                </div>

                <select
                  value={recCategory}
                  onChange={e => setRecCategory(e.target.value)}
                  className="bg-white ring-1 ring-black/[0.06] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F1424] font-semibold outline-none cursor-pointer"
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
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Due day of month</span>
                  <select
                    value={recDay}
                    onChange={e => setRecDay(parseInt(e.target.value, 10))}
                    className="bg-white ring-1 ring-black/[0.06] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F1424] outline-none cursor-pointer"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>
                        Day {d} of month
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Payment method</span>
                  <select
                    value={recPayment}
                    onChange={e => setRecPayment(e.target.value)}
                    className="bg-white ring-1 ring-black/[0.06] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F1424] outline-none cursor-pointer"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {recError && <p className="text-rose-600 text-xs font-semibold">{recError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelRecurringForm}
                  className="flex-1 py-2.5 text-xs font-bold text-[#64748B] bg-white ring-1 ring-black/[0.06] rounded-xl hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecurring}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#0F1424] rounded-xl hover:bg-[#181D3A] active:scale-95 transition-all shadow-xs"
                >
                  {editingRecurringId ? 'Update Recurring' : 'Save Recurring'}
                </button>
              </div>
            </div>
          )}

          {/* List of Recurring Expenses */}
          {recurringExpenses.length === 0 ? (
            <p className="text-xs text-[#64748B] italic py-4 text-center bg-[#F8FAFC] rounded-[18px] ring-1 ring-black/[0.04]">
              No recurring expenses set up yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recurringExpenses.map(item => {
                const cat = catMap[item.categoryId];
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 rounded-[18px] transition-all ring-1 ${
                      item.isActive
                        ? 'bg-white ring-black/[0.05] shadow-2xs'
                        : 'bg-[#F8FAFC] ring-black/[0.03] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[14px] bg-[#F1F5F9] ring-1 ring-black/[0.04] flex items-center justify-center text-xl flex-shrink-0">
                        {cat?.icon || '🔁'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[#0F1424] leading-tight truncate">
                          {item.description}
                        </h4>
                        <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                          Day {item.dayOfMonth} each month • {cat?.name || 'General'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                      <span className="text-xs sm:text-sm font-black text-[#0F1424] tabular-nums tracking-tight">
                        {formatCurrency(item.amountInCents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleRecurringExpense(item.id)}
                        className={`w-9 h-5 rounded-full transition-colors relative flex items-center flex-shrink-0 ${
                          item.isActive ? 'bg-[#0F1424]' : 'bg-[#cbd5e1]'
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
                        type="button"
                        onClick={() => handleStartEditRecurring(item)}
                        className="w-7 h-7 rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#0F1424] hover:bg-[#E2E8F0] flex items-center justify-center transition-all"
                        title="Edit recurring expense"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecurringClick(item)}
                        className="w-7 h-7 rounded-full bg-[#F1F5F9] text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all"
                        title="Delete recurring item"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Manage Categories */}
        <section className="bg-white rounded-[24px] p-5 ring-1 ring-black/[0.05] shadow-2xs">
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="flex justify-between items-center w-full group active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center ring-1 ring-indigo-200/50">
                <span className="material-symbols-outlined text-[22px]">category</span>
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-[#0F1424] block">Manage Categories</span>
                <span className="text-xs text-[#64748B]">Custom icons, limits & active state</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#94A3B8] group-hover:text-[#0F1424] transition-colors">chevron_right</span>
          </button>
        </section>

        {/* Data & Privacy */}
        <section className="bg-white rounded-[26px] p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Data & Privacy</h3>
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 bg-white ring-1 ring-black/[0.08] text-[#0F1424] font-bold text-xs py-3.5 rounded-full hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowClearDialog(true)}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700 font-bold text-xs py-3.5 rounded-full hover:bg-rose-100 active:scale-95 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
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
