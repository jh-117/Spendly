import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useExpenses } from '../hooks/useExpenses';
import { useBudget } from '../hooks/useBudget';
import { useSettings } from '../hooks/useSettings';
import { useCategories } from '../hooks/useCategories';
import { useRecurringExpenses } from '../hooks/useRecurringExpenses';
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
  const { processDueRecurring } = useRecurringExpenses();

  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    // Process any due recurring expenses
    processDueRecurring(addExpense);
  }, [processDueRecurring, addExpense]);

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
  const isCalendar = cycleStartDay === 1;

  const currentCycle = useMemo(() => getBillingCycle(today, cycleStartDay), [today, cycleStartDay]);
  const prevCycle = useMemo(() => getPreviousCycle(currentCycle, cycleStartDay), [currentCycle, cycleStartDay]);

  const cycleExpenses = useMemo(() =>
    filterByDateRange(expenses, currentCycle.startDate, currentCycle.endDate),
    [expenses, currentCycle]
  );

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
    getBudgetRemaining(cycleTotal, budget?.amountInCents),
    [cycleTotal, budget]
  );

  const budgetPct = useMemo(() =>
    getBudgetUsedPercentage(cycleTotal, budget?.amountInCents),
    [cycleTotal, budget]
  );

  const daysRemaining = currentCycle.daysRemaining;
  const safeToSpend = useMemo(() =>
    getCycleSafeToSpend(budget?.amountInCents, cycleTotal, currentCycle),
    [budget, cycleTotal, currentCycle]
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

  const progressPct = Math.min(budgetPct ?? 0, 100);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-24 text-[#1a1c1c] antialiased">
      {/* Header */}
      <header className="bg-[#f9f9f9] w-full top-0 sticky z-40">
        <div className="flex justify-between items-center px-5 py-4 max-w-[768px] mx-auto">
          <div className="w-10 h-10 rounded-full bg-[#eeeeee] flex items-center justify-center overflow-hidden">
            <img src="https://i.pravatar.cc/150?img=47" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-headline-lg-mobile font-bold text-[#181d3a] absolute left-1/2 -translate-x-1/2">Spendly</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-2 flex flex-col gap-6">
        {/* Greeting */}
        <section className="mt-2">
          <h2 className="text-headline-lg-mobile text-[#1a1c1c]">{greeting}, Jiahuey</h2>
          <p className="text-body-sm text-[#64748B] mt-1">Here's a look at your spending.</p>
        </section>

        {/* Bento Stats */}
        <section className="grid grid-cols-2 gap-4">
          {/* This Cycle / This Month — full width */}
          <div className="col-span-2 bg-white rounded-[24px] p-6 border border-[#e2e2e2] shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#181d3a]/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-body-sm text-[#64748B] font-medium">
                {isCalendar ? 'This Month' : 'Current Pay Cycle'}
              </h3>
              {!isCalendar && (
                <span className="text-[11px] font-semibold bg-[#dee1ff]/70 text-[#181d3a] px-2.5 py-0.5 rounded-full">
                  {currentCycle.shortLabel}
                </span>
              )}
            </div>

            {cycleTotal === 0 ? (
              <div className="flex flex-col gap-3">
                <div className="text-display-hero text-[#181d3a] tracking-tight">
                  RM <span className="text-[#dadada]">0.00</span>
                </div>
                <button
                  onClick={() => navigate('/add')}
                  className="self-start bg-[#181d3a] text-white text-body-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all"
                >
                  + Add first expense
                </button>
              </div>
            ) : (
              <>
                <div className="text-display-hero text-[#181d3a] tracking-tight">
                  RM{' '}
                  <span>{Math.floor(cycleTotal / 100).toLocaleString('en-MY')}</span>
                  <span className="text-2xl text-[#64748B]/80">
                    .{String(cycleTotal % 100).padStart(2, '0')}
                  </span>
                </div>
                {comparison.direction !== 'no-data' && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="bg-[#f9f9f9] px-2 py-1 rounded-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#64748B]">
                        {comparison.direction === 'up' ? 'trending_up' : 'trending_down'}
                      </span>
                      <span className="text-label-caps text-[#64748B] normal-case">
                        {comparison.direction === 'up' ? '+' : '-'}
                        {comparison.changePercent?.toFixed(0)}% vs last {isCalendar ? 'month' : 'cycle'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Safe to Spend / Daily Avg */}
          {budget?.amountInCents != null ? (
            <div className="bg-white rounded-[20px] p-5 border border-[#e2e2e2] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-[#64748B]">
                  <span className="material-symbols-outlined text-[18px] text-[#2e7d32]">verified_user</span>
                  <h3 className="text-body-sm text-[#64748B] leading-tight font-semibold">Safe to Spend</h3>
                </div>
                <div className="text-headline-lg-mobile text-[#181d3a]">{formatCurrency(safeToSpend)}<span className="text-body-sm text-[#64748B] font-normal">/day</span></div>
              </div>
              <div className="text-[11px] text-[#64748B] mt-3 pt-3 border-t border-[#f3f3f3] flex items-center justify-between">
                <span>{daysRemaining} days left</span>
                {!isCalendar && (
                  <span className="text-[#181d3a] font-medium">Payday: {currentCycle.nextPayday}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[20px] p-5 border border-[#e2e2e2] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-3 text-[#64748B]">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <h3 className="text-body-sm text-[#64748B] leading-tight">Daily Avg</h3>
                <span className="text-[10px] bg-[#f3f3f3] px-1.5 py-0.5 rounded text-[#64748B] ml-auto">Behavioral</span>
              </div>
              <div className="text-headline-lg-mobile text-[#181d3a]">{formatCurrency(avgDaily)}</div>
            </div>
          )}

          {/* Today */}
          <div className="bg-white rounded-[20px] p-5 border border-[#e2e2e2] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-3 text-[#64748B]">
              <span className="material-symbols-outlined text-[18px]">today</span>
              <h3 className="text-body-sm text-[#64748B] leading-tight">Today</h3>
            </div>
            <div className="text-headline-lg-mobile text-[#181d3a]">{formatCurrency(todayTotal)}</div>
          </div>

          {/* Budget */}
          <div className="col-span-2 bg-white rounded-[20px] p-5 border border-[#e2e2e2] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            {budget?.amountInCents == null ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-sm text-[#64748B]">Monthly Budget</h3>
                  <p className="text-body-sm text-[#64748B] mt-1">Not set yet</p>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="bg-[#181d3a] text-white text-body-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all"
                >
                  Set Budget
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="text-body-sm text-[#64748B]">Budget Remaining</h3>
                    <div className="text-headline-lg-mobile text-[#181d3a] mt-1">
                      {formatCurrency(budgetRemaining)}{' '}
                      <span className="text-body-sm text-[#64748B] font-normal">left</span>
                    </div>
                  </div>
                  <div className="text-body-sm text-[#64748B] text-right">
                    of {formatCurrency(budget.amountInCents)}
                  </div>
                </div>
                <div className="h-3 w-full bg-[#e8e8e8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#181d3a] rounded-full transition-all duration-1000"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                
                {paceStatus && (
                  <div className="mt-4 pt-3 border-t border-[#f3f3f3] flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#64748B] mt-0.5">insights</span>
                    <p className="text-[12px] text-[#64748B] leading-snug">
                      <span className="font-semibold text-[#1a1c1c]">{Math.round(budgetPct)}% of budget used.</span><br/>
                      {PACE_TEXT[paceStatus]}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Recent Expenses */}
        {recentExpenses.length > 0 && (
          <section className="mt-4 mb-8">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-headline-lg-mobile text-[#1a1c1c]">Recent</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-body-sm text-[#64748B] hover:text-[#181d3a] transition-colors"
              >
                See all
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[#e2e2e2]/50 shadow-[0_1px_4px_rgba(0,0,0,0.01)] p-2 flex flex-col gap-1">
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
