import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudget } from '../hooks/useBudget';
import { useSettings } from '../hooks/useSettings';
import { useExpenses } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../hooks/useToast';
import { validateBudget } from '../lib/validation';
import { fromCents } from '../lib/calculations';
import { exportExpensesToCSV } from '../lib/export';
import { storage } from '../lib/storage';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';

export default function Settings() {
  const navigate = useNavigate();
  const { budget, setBudget } = useBudget();
  const { settings, updateSettings } = useSettings();
  const { expenses, clearAllExpenses } = useExpenses();
  const { categories, resetCategories } = useCategories();
  const { toast, showToast } = useToast();

  const [budgetInput, setBudgetInput] = useState(
    budget?.amountInCents ? fromCents(budget.amountInCents) : ''
  );
  const [budgetError, setBudgetError] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleSaveBudget = () => {
    const result = validateBudget(budgetInput);
    if (!result.valid) { setBudgetError(result.error); return; }
    setBudgetError('');
    setBudget(budgetInput.replace(/,/g, ''));
    showToast('Budget saved ✓');
  };

  const handleClearAll = () => {
    clearAllExpenses();
    resetCategories();
    storage.clearAll();
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
            <p className="text-[12px] text-[#64748B] bg-[#f8fafc] p-3 rounded-xl border border-[#e2e2e2] leading-relaxed">
              💡 <strong>Accurate Safe-to-Spend:</strong> When your salary arrives on the 25th, your budget and daily pace will automatically calculate until your next payday instead of the calendar month end.
            </p>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white rounded-2xl p-6 border border-[#e2e2e2] flex flex-col gap-6">
          <h3 className="text-label-caps text-[#64748B] uppercase">Notifications</h3>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-body-md text-[#1a1c1c] block">Daily Check-in</span>
              <span className="text-body-sm text-[#64748B] block mt-0.5">
                Reminder when you open the app (not a push notification)
              </span>
            </div>
            {/* Toggle */}
            <button
              onClick={() => updateSettings({ reminderEnabled: !settings.reminderEnabled })}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 ${
                settings.reminderEnabled ? 'bg-[#181d3a]' : 'bg-[#e2e2e2]'
              }`}
            >
              <span
                className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                  settings.reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-body-md text-[#1a1c1c]">Reminder Time</span>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={e => updateSettings({ reminderTime: e.target.value })}
              className="bg-[#f3f3f3] border-none rounded-lg text-body-md text-[#181d3a] px-3 py-2 focus:ring-1 focus:ring-[#181d3a] outline-none cursor-pointer"
            />
          </div>
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

      <Toast toast={toast} />
    </div>
  );
}
