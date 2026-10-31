import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useExpenses } from '../hooks/useExpenses';
import { useBudget } from '../hooks/useBudget';
import { useSettings } from '../hooks/useSettings';
import { useCategories } from '../hooks/useCategories';
import { useRecurringExpenses } from '../hooks/useRecurringExpenses';
import CheckInModal from '../components/ui/CheckInModal';
import {
  getDailyTotal,
  getBudgetRemaining,
  getBudgetUsedPercentage,
  getMonthComparison,
  formatCurrency,
  getSpendingPaceStatus,
  getBillingCycle,
  getPreviousCycle,
  filterByDateRange,
  getCycleAverageDailySpending,
  getCycleSafeToSpend,
  getCycleBudgetPace,
} from '../lib/calculations';
import ExpenseListItem from '../components/expense/ExpenseListItem';

function Home() {
  const navigate = useNavigate();
  const { expenses, addExpense } = useExpenses();
  const { budget } = useBudget();
  const { settings } = useSettings();
  const { categories } = useCategories();
  const { recurringExpenses, processDueRecurring } = useRecurringExpenses();

  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    // Update today periodically
    const interval = setInterval(() => setToday(new Date()), 60000 * 60);
    return () => clearInterval(interval);
  }, []);

  const greeting = useMemo(() => {
    const hour = today.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, [today]);

  const cycleStartDay = settings.cycleStartDay ?? 25;
  const adjustWeekend = settings.adjustWeekendPayday !== false;
  const isCalendar = cycleStartDay === 1;

  const currentCycle = useMemo(() => getBillingCycle(today, cycleStartDay, adjustWeekend), [today, cycleStartDay, adjustWeekend]);
  const prevCycle = useMemo(() => getPreviousCycle(currentCycle, cycleStartDay, adjustWeekend), [currentCycle, cycleStartDay, adjustWeekend]);

  const cycleExpenses = useMemo(() =>
    filterByDateRange(expenses, currentCycle.startDate, currentCycle.endDate),
    [expenses, currentCycle]
  );

  const processedCycleRef = useRef('');
  useEffect(() => {
    // Process due recurring expenses once per cycle start to prevent infinite loops
    if (currentCycle?.startDate && processedCycleRef.current !== currentCycle.startDate) {
      processedCycleRef.current = currentCycle.startDate;
      processDueRecurring(addExpense, currentCycle, expenses);
    }
  }, [currentCycle?.startDate, processDueRecurring, addExpense]);

  // Daily check-in reminder logic
  const [showCheckIn, setShowCheckIn] = useState(false);
  useEffect(() => {
    if (!settings.reminderEnabled) return;

    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const sessionKey = `spendly_reminder_shown_${todayStr}`;
      if (sessionStorage.getItem(sessionKey)) return;

      const now = new Date();
      const [rHour, rMin] = (settings.reminderTime || '21:00').split(':').map(Number);
      const reminderDate = new Date();
      reminderDate.setHours(rHour, rMin, 0, 0);
      if (now < reminderDate) return;

      const hasExpenseToday = expenses.some(e => e.expenseDate === todayStr);
      if (hasExpenseToday) return;

      sessionStorage.setItem(sessionKey, '1');
      setShowCheckIn(true);
    } catch {
      // Ignore sessionStorage errors
    }
  }, [settings.reminderEnabled, settings.reminderTime, expenses]);

  const handleLogExpense = () => {
    setShowCheckIn(false);
    navigate('/add');
  };

  const handleNothingToday = () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const existing = JSON.parse(sessionStorage.getItem('spendly_no_expense_days') || '[]');
      if (!existing.includes(todayStr)) existing.push(todayStr);
      sessionStorage.setItem('spendly_no_expense_days', JSON.stringify(existing));
    } catch {
      // Ignore
    }
    setShowCheckIn(false);
  };

  const prevCycleExpenses = useMemo(() =>
    filterByDateRange(expenses, prevCycle.startDate, prevCycle.endDate),
    [expenses, prevCycle]
  );

  const variableExpenses = useMemo(() => {
    const excludedIds = new Set(categories.filter(c => c.excludeFromAvg).map(c => c.id));
    return cycleExpenses.filter(e => !excludedIds.has(e.categoryId));
  }, [cycleExpenses, categories]);

  const cycleTotal = useMemo(() =>
    cycleExpenses.reduce((sum, e) => sum + e.amountInCents, 0),
    [cycleExpenses]
  );

  // Active recurring commitments for this cycle:
  // totalRecurringCents: all active recurring bills
  // pendingRecurringCents: active recurring bills not yet logged in cycleExpenses
  const { totalRecurringCents, pendingRecurringCents, loggedRecurringCents } = useMemo(() => {
    const activeItems = recurringExpenses.filter(r => r.isActive);
    const total = activeItems.reduce((sum, r) => sum + r.amountInCents, 0);

    let pending = 0;
    let logged = 0;

    activeItems.forEach(item => {
      const desc = (item.description || '').trim();
      const isAlreadyInExpenses = cycleExpenses.some(e => {
        const eDesc = (e.description || '').trim();
        return desc && (
          eDesc === `${desc} (Recurring)` ||
          (eDesc.startsWith(desc) && eDesc.includes('(Recurring)'))
        );
      });

      if (isAlreadyInExpenses) {
        logged += item.amountInCents;
      } else {
        pending += item.amountInCents;
      }
    });

    return { totalRecurringCents: total, pendingRecurringCents: pending, loggedRecurringCents: logged };
  }, [recurringExpenses, cycleExpenses]);

  const prevTotal = useMemo(() =>
    prevCycleExpenses.reduce((sum, e) => sum + e.amountInCents, 0),
    [prevCycleExpenses]
  );

  const todayStr = format(today, 'yyyy-MM-dd');
  const todayTotal = useMemo(() => getDailyTotal(expenses, todayStr), [expenses, todayStr]);

  const avgDaily = useMemo(() =>
    getCycleAverageDailySpending(variableExpenses, currentCycle, true),
    [variableExpenses, currentCycle]
  );

  const comparison = useMemo(() =>
    getMonthComparison(cycleTotal, prevTotal),
    [cycleTotal, prevTotal]
  );

  const budgetRemaining = useMemo(() =>
    getBudgetRemaining(cycleTotal, budget?.amountInCents, pendingRecurringCents),
    [cycleTotal, budget, pendingRecurringCents]
  );

  // Total committed/used budget percentage (spent + pending reserved recurring)
  const totalCommittedCents = cycleTotal + pendingRecurringCents;
  const budgetPct = useMemo(() =>
    getBudgetUsedPercentage(totalCommittedCents, budget?.amountInCents),
    [totalCommittedCents, budget]
  );

  const daysRemaining = currentCycle.daysRemaining;
  const safeToSpend = useMemo(() =>
    getCycleSafeToSpend(budget?.amountInCents, cycleTotal, currentCycle, pendingRecurringCents),
    [budget, cycleTotal, currentCycle, pendingRecurringCents]
  );

  const pace = useMemo(() =>
    getCycleBudgetPace(budget?.amountInCents, currentCycle),
    [budget, currentCycle]
  );

  const paceStatus = useMemo(() =>
    pace ? getSpendingPaceStatus(cycleTotal, pace.expectedUsage) : null,
    [cycleTotal, pace]
  );

  const PACE_TEXT = {
    below: "You're spending slower than your typical pace.",
    near: "You're exactly on track for this point in the cycle.",
    above: "You've used more than your typical pace for this point in the cycle."
  };

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c; });
    return m;
  }, [categories]);

  // Recent: last 5 by createdAt desc
  const recentExpenses = useMemo(() =>
    [...expenses]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5),
    [expenses]
  );

  const todayExpensesCount = useMemo(() =>
    expenses.filter(e => e.expenseDate === todayStr).length,
    [expenses, todayStr]
  );

  const spentPct = budget?.amountInCents ? Math.min((cycleTotal / budget.amountInCents) * 100, 100) : 0;
  const pendingRecurringPct = budget?.amountInCents
    ? Math.min(
        (pendingRecurringCents / budget.amountInCents) * 100,
        Math.max(0, 100 - spentPct)
      )
    : 0;

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-28 text-[#111625] antialiased selection:bg-[#181D3A] selection:text-white">
      {showCheckIn && (
        <CheckInModal
          onLogExpense={handleLogExpense}
          onNothingToday={handleNothingToday}
        />
      )}

      {/* Modern Frosted Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F8FAFC]/85 border-b border-black/[0.03] transition-all">
        <div className="flex justify-between items-center px-5 py-3.5 max-w-[768px] mx-auto">
          {/* Logo & Brand pill */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F1424] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#0F1424] tracking-tight leading-none">Spendly</span>
              <span className="text-[10px] font-medium text-[#64748B] tracking-wide mt-0.5">Personal Ledger</span>
            </div>
          </div>

          {/* Quick Date pill & Settings */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-black/[0.04] text-[11px] font-medium text-[#64748B] shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{format(today, 'EEE, d MMM')}</span>
            </div>
            <button
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="w-9 h-9 rounded-full bg-white ring-1 ring-black/[0.06] flex items-center justify-center text-[#64748B] hover:text-[#0F1424] hover:shadow-xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[19px]">settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-4 flex flex-col gap-6">
        {/* Dynamic Contextual Greeting */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {format(today, 'EEEE, MMMM d')}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1424] tracking-tight">
              {greeting}, Jiahuey
            </h2>
          </div>
          <div className="self-start sm:self-auto">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ring-1 ${
              todayExpensesCount > 0
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                : 'bg-white text-[#64748B] ring-black/[0.06] shadow-2xs'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${todayExpensesCount > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              {todayExpensesCount > 0 ? `${todayExpensesCount} logged today` : 'Ready to track'}
            </span>
          </div>
        </section>

        {/* Bento Grid */}
        <section className="grid grid-cols-2 gap-4">
          {/* HERO CARD: Dark Obsidian Flagship Card (方案 A) */}
          <div className="col-span-2 relative overflow-hidden rounded-[26px] p-6 sm:p-7 bg-[#0F1424] text-white ring-1 ring-white/[0.08] shadow-[0_20px_40px_-15px_rgba(15,20,36,0.35),0_1px_2px_rgba(0,0,0,0.2)]">
            {/* Ambient Radial Glows */}
            <div className="absolute -top-24 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-16 w-52 h-52 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.025] pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between">
              {/* Card Top Label */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.7)]" />
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                    {isCalendar ? 'This Month' : 'Current Pay Cycle'}
                  </span>
                </div>
                {!isCalendar && (
                  <span className="text-[11px] font-medium text-white/90 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    {currentCycle.shortLabel}
                  </span>
                )}
              </div>

              {/* Amount Display */}
              {cycleTotal === 0 ? (
                <div className="py-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-white/40 tracking-wider">RM</span>
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white/40 tabular-nums">0.00</span>
                  </div>
                  <p className="text-xs text-white/60 mt-2 mb-4">No spending recorded in this cycle yet.</p>
                  <button
                    onClick={() => navigate('/add')}
                    className="inline-flex items-center gap-2 bg-white text-[#0F1424] text-xs font-bold px-4 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Record first expense
                  </button>
                </div>
              ) : (
                <>
                  <div className="my-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base sm:text-lg font-semibold text-white/50 tracking-wider">RM</span>
                      <span className="text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums">
                        {Math.floor(cycleTotal / 100).toLocaleString('en-MY')}
                      </span>
                      <span className="text-2xl sm:text-3xl font-semibold text-white/60 tabular-nums">
                        .{String(cycleTotal % 100).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: Micro-comparison & Date span */}
                  <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2">
                    {comparison.direction !== 'no-data' ? (
                      <div className="inline-flex items-center gap-1.5 bg-white/[0.08] backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full">
                        <span className={`material-symbols-outlined text-[15px] ${
                          comparison.direction === 'up' ? 'text-amber-300' : 'text-emerald-300'
                        }`}>
                          {comparison.direction === 'up' ? 'trending_up' : 'trending_down'}
                        </span>
                        <span className="text-xs font-medium text-white/90">
                          {comparison.direction === 'up' ? '+' : '-'}
                          {comparison.changePercent?.toFixed(0)}% vs last {isCalendar ? 'month' : 'cycle'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/50">Initial tracking period</span>
                    )}

                    <div className="text-[11px] text-white/50 font-medium">
                      {currentCycle.startDate} – {currentCycle.endDate}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Safe to Spend / Daily Avg (Bento Box 1) */}
          {budget?.amountInCents != null ? (
            <div className="bg-white rounded-[22px] p-5 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.06)]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    </div>
                    <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Safe to Spend</h3>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-[#0F1424] tracking-tight tabular-nums">
                    {formatCurrency(safeToSpend)}
                  </span>
                  <span className="text-xs text-[#64748B] font-medium">/day</span>
                </div>
              </div>
              <div className="text-[11px] text-[#64748B] mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between font-medium">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full text-[10px]">
                  {daysRemaining} days left
                </span>
                {!isCalendar && (
                  <span className="text-[#0F1424]">Payday {currentCycle.nextPayday}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[22px] p-5 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.06)]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    </div>
                    <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Daily Avg</h3>
                  </div>
                  <span className="text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] px-1.5 py-0.5 rounded">Cycle</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#0F1424] tracking-tight tabular-nums">
                  {formatCurrency(avgDaily)}
                </div>
              </div>
              <div className="text-[11px] text-[#64748B] mt-4 pt-3 border-t border-[#F1F5F9]">
                Based on variable expenses
              </div>
            </div>
          )}

          {/* Today's Expense (Bento Box 2) */}
          <div className="bg-white rounded-[22px] p-5 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.06)]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">today</span>
                  </div>
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Today</h3>
                </div>
                <span className="text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full">
                  {todayExpensesCount} {todayExpensesCount === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[#0F1424] tracking-tight tabular-nums">
                {formatCurrency(todayTotal)}
              </div>
            </div>
            <div className="text-[11px] text-[#64748B] mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
              <span>{format(today, 'MMM d')}</span>
              <button
                onClick={() => navigate('/add')}
                className="text-xs font-semibold text-[#0F1424] hover:opacity-75 active:scale-95 transition-all inline-flex items-center gap-0.5"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Budget Master Card */}
          <div className="col-span-2 bg-white rounded-[24px] p-5 sm:p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
            {budget?.amountInCents == null ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F1424]">Monthly Budget</h3>
                  <p className="text-xs text-[#64748B] mt-1">Set a spending target to unlock pace tracking and daily limits.</p>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="self-start sm:self-auto bg-[#0F1424] text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-[#181D3A] active:scale-95 transition-all shadow-xs"
                >
                  Set Budget
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Budget Remaining</h3>
                      {totalRecurringCents > 0 && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full" title="Recurring commitments are reserved upfront">
                          Recurring Reserved
                        </span>
                      )}
                    </div>
                    <div className="text-2xl sm:text-3xl text-[#0F1424] mt-1 font-extrabold tracking-tight tabular-nums">
                      {formatCurrency(budgetRemaining)}{' '}
                      <span className="text-xs font-medium text-[#64748B]">left</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#64748B] text-right">
                    <span className="font-semibold text-[#0F1424]">{Math.round(budgetPct)}%</span> of {formatCurrency(budget.amountInCents)}
                  </div>
                </div>

                {/* Multi-segment Progress Bar: Capsule Track */}
                <div className="h-3 w-full bg-[#F1F5F9] rounded-full overflow-hidden flex p-0.5 ring-1 ring-black/[0.03]">
                  <div
                    className="h-full bg-gradient-to-r from-[#0F1424] to-[#1E2746] rounded-full transition-all duration-700"
                    style={{ width: `${spentPct}%` }}
                    title={`Spent: ${formatCurrency(cycleTotal)}`}
                  />
                  {pendingRecurringPct > 0 && (
                    <div
                      className="h-full bg-[#94A3B8] opacity-70 rounded-full transition-all duration-700 ml-0.5"
                      style={{ width: `${pendingRecurringPct}%` }}
                      title={`Reserved for pending recurring bills: ${formatCurrency(pendingRecurringCents)}`}
                    />
                  )}
                </div>

                {/* Breakdown legend */}
                {totalRecurringCents > 0 && (
                  <div className="mt-3.5 pt-2.5 flex flex-wrap items-center justify-between text-[11px] text-[#64748B] gap-2 border-t border-[#F8FAFC]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0F1424] flex-shrink-0" />
                      <span>Direct Spent: <span className="font-semibold text-[#0F1424]">{formatCurrency(cycleTotal)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#94A3B8] flex-shrink-0" />
                      <span>
                        Recurring: <span className="font-semibold text-[#0F1424]">{formatCurrency(totalRecurringCents)}</span>
                        {pendingRecurringCents > 0 ? (
                          <span className="text-[#64748B] ml-1">({formatCurrency(pendingRecurringCents)} pending)</span>
                        ) : (
                          <span className="text-emerald-600 font-medium ml-1">(all logged)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                
                {paceStatus && (
                  <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#F8FAFC] flex items-center justify-center text-[#64748B] flex-shrink-0 mt-0.5 ring-1 ring-black/[0.04]">
                      <span className="material-symbols-outlined text-[15px]">speed</span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      <span className="font-semibold text-[#0F1424]">{Math.round(budgetPct)}% of budget utilized. </span>
                      {PACE_TEXT[paceStatus]}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Category budget alerts */}
          {(() => {
            const alerts = categories
              .filter(c => c.isActive && c.budgetInCents)
              .map(c => {
                const spent = cycleExpenses
                  .filter(e => e.categoryId === c.id)
                  .reduce((s, e) => s + e.amountInCents, 0);
                const pct = spent / c.budgetInCents;
                return { cat: c, spent, pct };
              })
              .filter(a => a.pct >= 0.8)
              .sort((a, b) => b.pct - a.pct);
            
            if (!alerts.length) return null;
            return (
              <div className="col-span-2 flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Category Limit Alerts</span>
                  <button
                    onClick={() => navigate('/categories')}
                    className="text-xs text-[#0F1424] hover:underline font-semibold"
                  >
                    Manage
                  </button>
                </div>
                {alerts.map(({ cat, spent, pct }) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-[18px] px-4 py-3 ring-1 ring-black/[0.05] flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#0F1424] block truncate">{cat.name}</span>
                        <span className="text-[11px] text-[#64748B]">
                          {formatCurrency(spent)} of {formatCurrency(cat.budgetInCents)} limit
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                      pct >= 1
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}>
                      {pct >= 1 ? 'Limit Reached' : `${Math.round(pct * 100)}%`}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* Recent Expenses */}
        {recentExpenses.length > 0 && (
          <section className="mt-2 mb-6">
            <div className="flex justify-between items-center mb-3 px-1">
              <div>
                <h3 className="text-lg font-bold text-[#0F1424] tracking-tight">Recent Activity</h3>
                <p className="text-xs text-[#64748B]">Latest recorded transactions</p>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="text-xs font-bold text-[#0F1424] hover:text-indigo-600 transition-colors flex items-center gap-0.5"
              >
                <span>See all</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
            <div className="bg-white rounded-[24px] ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] p-2.5 flex flex-col divide-y divide-[#F8FAFC]">
              {recentExpenses.map(expense => (
                <ExpenseListItem
                  key={expense.id}
                  expense={expense}
                  category={catMap[expense.categoryId]}
                  onClick={() => navigate(`/history?detail=${expense.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Home;
