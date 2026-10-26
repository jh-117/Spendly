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

  useEffect(() => {
    // Process any due recurring expenses with cycle context to prevent misaligned dates
    if (currentCycle) {
      processDueRecurring(addExpense, currentCycle, expenses);
    }
  }, [processDueRecurring, addExpense, currentCycle, expenses]);

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
      const isAlreadyInExpenses = cycleExpenses.some(
        e => e.description === `${item.description} (Recurring)` ||
             (e.description.startsWith(item.description) && e.description.includes('(Recurring)'))
      );

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

  const spentPct = budget?.amountInCents ? Math.min((cycleTotal / budget.amountInCents) * 100, 100) : 0;
  const pendingRecurringPct = budget?.amountInCents
    ? Math.min(
        (pendingRecurringCents / budget.amountInCents) * 100,
        Math.max(0, 100 - spentPct)
      )
    : 0;

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
                    <div className="flex items-center gap-2">
                      <h3 className="text-body-sm text-[#64748B]">Budget Remaining</h3>
                      {totalRecurringCents > 0 && (
                        <span className="text-[10px] bg-[#f1f5f9] text-[#475569] font-medium px-2 py-0.5 rounded-full" title="Recurring commitments are reserved upfront">
                          Recurring Reserved
                        </span>
                      )}
                    </div>
                    <div className="text-headline-lg-mobile text-[#181d3a] mt-1 font-bold">
                      {formatCurrency(budgetRemaining)}{' '}
                      <span className="text-body-sm text-[#64748B] font-normal">left</span>
                    </div>
                  </div>
                  <div className="text-body-sm text-[#64748B] text-right">
                    of {formatCurrency(budget.amountInCents)}
                  </div>
                </div>

                {/* Multi-segment Progress Bar: Spent & Reserved Recurring */}
                <div className="h-3 w-full bg-[#e8e8e8] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#181d3a] transition-all duration-700"
                    style={{ width: `${spentPct}%` }}
                    title={`Spent: ${formatCurrency(cycleTotal)}`}
                  />
                  {pendingRecurringPct > 0 && (
                    <div
                      className="h-full bg-[#64748B] opacity-60 transition-all duration-700"
                      style={{ width: `${pendingRecurringPct}%` }}
                      title={`Reserved for pending recurring bills: ${formatCurrency(pendingRecurringCents)}`}
                    />
                  )}
                </div>

                {/* Breakdown legend */}
                {totalRecurringCents > 0 && (
                  <div className="mt-3 pt-2 flex flex-wrap items-center justify-between text-[11px] text-[#64748B] gap-2 border-t border-[#f8fafc]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#181d3a] flex-shrink-0" />
                      <span>Spent: <span className="font-semibold text-[#1a1c1c]">{formatCurrency(cycleTotal)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#64748B] opacity-60 flex-shrink-0" />
                      <span>
                        Recurring: <span className="font-semibold text-[#1a1c1c]">{formatCurrency(totalRecurringCents)}</span>
                        {pendingRecurringCents > 0 ? (
                          <span className="text-[#64748B] ml-1">({formatCurrency(pendingRecurringCents)} pending)</span>
                        ) : (
                          <span className="text-[#10b981] ml-1">(all logged)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                
                {paceStatus && (
                  <div className="mt-3 pt-2.5 border-t border-[#f3f3f3] flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#64748B] mt-0.5">insights</span>
                    <p className="text-[12px] text-[#64748B] leading-snug">
                      <span className="font-semibold text-[#1a1c1c]">{Math.round(budgetPct)}% of budget utilized.</span><br/>
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
              <div className="col-span-2 flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-label-caps text-[#64748B] uppercase">Category Limit Alerts</span>
                  <button
                    onClick={() => navigate('/categories')}
                    className="text-[11px] text-[#64748B] hover:text-[#181d3a] font-medium"
                  >
                    Manage
                  </button>
                </div>
                {alerts.map(({ cat, spent, pct }) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-[16px] px-4 py-3 border border-[#e2e2e2] flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl flex-shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <span className="text-body-sm font-semibold text-[#181d3a] block truncate">{cat.name}</span>
                        <span className="text-[11px] text-[#64748B]">
                          {formatCurrency(spent)} of {formatCurrency(cat.budgetInCents)} limit
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                      pct >= 1
                        ? 'bg-[#dee1ff] text-[#424769]'
                        : 'bg-[#f1f5f9] text-[#64748B]'
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
