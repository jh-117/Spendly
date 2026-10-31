import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useExpenses } from '../hooks/useExpenses';
import { useBudget } from '../hooks/useBudget';
import { useCategories } from '../hooks/useCategories';
import { useSettings } from '../hooks/useSettings';
import {
  getCurrentMonthAverageDailySpending,
  getCompletedMonthAverageDailySpending,
  getBudgetPace,
  getSpendingPaceStatus,
  getCategoryTotals,
  getCategoryPercentages,
  getTopSpendingCategory,
  getMonthComparison,
  getEstimatedMonthlySpending,
  filterByMonth,
  filterByDateRange,
  formatCurrency,
  toYearMonth,
  getPreviousYearMonth,
  formatYearMonth,
  getBillingCycle,
  getPreviousCycle,
  getNextCycle,
  getCycleAverageDailySpending,
  getCycleBudgetPace,
  getEstimatedCycleSpending,
} from '../lib/calculations';
import EmptyState from '../components/ui/EmptyState';

function getNextYearMonth(ym) {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month, 1);
  return format(d, 'yyyy-MM');
}

const PACE_LABELS = {
  below: { text: 'Below pace', sub: "You're spending less than expected. Great job!" },
  near:  { text: 'Near pace',  sub: "You're spending roughly as expected." },
  above: { text: 'Above pace', sub: "You're spending more than expected this period." },
};

export default function Insights() {
  const navigate = useNavigate();
  const { expenses } = useExpenses();
  const { budget } = useBudget();
  const { categories } = useCategories();
  const { settings } = useSettings();

  const cycleStartDay = settings.cycleStartDay ?? 25;
  const adjustWeekend = settings.adjustWeekendPayday !== false;
  const isCalendarOnly = cycleStartDay === 1;

  // View mode: 'cycle' or 'month'
  const [viewMode, setViewMode] = useState(isCalendarOnly ? 'month' : 'cycle');

  // Month navigation
  const today = useMemo(() => new Date(), []);
  const currentYM = toYearMonth(today);
  const [yearMonth, setYearMonth] = useState(currentYM);

  // Cycle navigation
  const currentCycle = useMemo(() => getBillingCycle(today, cycleStartDay, adjustWeekend), [today, cycleStartDay, adjustWeekend]);
  const [activeCycle, setActiveCycle] = useState(() => getBillingCycle(today, cycleStartDay, adjustWeekend));

  const isCurrentPeriod = viewMode === 'cycle'
    ? activeCycle.isCurrentCycle
    : yearMonth === currentYM;

  const canGoNext = viewMode === 'cycle'
    ? activeCycle.startDate < currentCycle.startDate
    : yearMonth < currentYM;

  const prevYM = getPreviousYearMonth(yearMonth);

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

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach(c => { m[c.id] = c; });
    return m;
  }, [categories]);

  // Period expenses
  const periodExpenses = useMemo(() => {
    if (viewMode === 'cycle') {
      return filterByDateRange(expenses, activeCycle.startDate, activeCycle.endDate);
    }
    return filterByMonth(expenses, yearMonth);
  }, [expenses, viewMode, activeCycle, yearMonth]);

  // Previous period expenses
  const prevPeriod = useMemo(() => {
    if (viewMode === 'cycle') {
      return getPreviousCycle(activeCycle, cycleStartDay, adjustWeekend);
    }
    return prevYM;
  }, [viewMode, activeCycle, cycleStartDay, adjustWeekend, prevYM]);

  const prevPeriodExpenses = useMemo(() => {
    if (viewMode === 'cycle') {
      return filterByDateRange(expenses, prevPeriod.startDate, prevPeriod.endDate);
    }
    return filterByMonth(expenses, prevPeriod);
  }, [expenses, viewMode, prevPeriod]);

  const variablePeriodExpenses = useMemo(() => {
    const excludedIds = new Set(categories.filter(c => c.excludeFromAvg).map(c => c.id));
    return periodExpenses.filter(e => !excludedIds.has(e.categoryId));
  }, [periodExpenses, categories]);

  const fixedTotalThisPeriod = useMemo(() => {
    const excludedIds = new Set(categories.filter(c => c.excludeFromAvg).map(c => c.id));
    return periodExpenses.filter(e => excludedIds.has(e.categoryId)).reduce((sum, e) => sum + e.amountInCents, 0);
  }, [periodExpenses, categories]);

  const periodTotal = useMemo(() =>
    periodExpenses.reduce((sum, e) => sum + e.amountInCents, 0),
    [periodExpenses]
  );

  const prevPeriodTotal = useMemo(() =>
    prevPeriodExpenses.reduce((sum, e) => sum + e.amountInCents, 0),
    [prevPeriodExpenses]
  );

  const avgDaily = useMemo(() => {
    if (viewMode === 'cycle') {
      return getCycleAverageDailySpending(variablePeriodExpenses, activeCycle, isCurrentPeriod);
    }
    return isCurrentPeriod
      ? getCurrentMonthAverageDailySpending(variablePeriodExpenses, yearMonth, today)
      : getCompletedMonthAverageDailySpending(variablePeriodExpenses, yearMonth);
  }, [viewMode, variablePeriodExpenses, activeCycle, isCurrentPeriod, yearMonth, today]);

  const estimated = useMemo(() => {
    if (!isCurrentPeriod) return null;
    if (viewMode === 'cycle') {
      return getEstimatedCycleSpending(avgDaily, activeCycle, fixedTotalThisPeriod);
    }
    return getEstimatedMonthlySpending(avgDaily, yearMonth, fixedTotalThisPeriod);
  }, [isCurrentPeriod, viewMode, avgDaily, activeCycle, fixedTotalThisPeriod, yearMonth]);

  const categoryTotals = useMemo(() => getCategoryTotals(periodExpenses), [periodExpenses]);
  const categoryPcts = useMemo(() => getCategoryPercentages(categoryTotals, periodTotal), [categoryTotals, periodTotal]);
  const topCategory = useMemo(() => getTopSpendingCategory(categoryTotals, periodTotal), [categoryTotals, periodTotal]);
  const comparison = useMemo(() => getMonthComparison(periodTotal, prevPeriodTotal), [periodTotal, prevPeriodTotal]);

  const pace = useMemo(() => {
    if (!isCurrentPeriod || !budget?.amountInCents) return null;
    if (viewMode === 'cycle') {
      return getCycleBudgetPace(budget.amountInCents, activeCycle);
    }
    return getBudgetPace(budget.amountInCents, yearMonth, today);
  }, [isCurrentPeriod, budget, viewMode, activeCycle, yearMonth, today]);

  const paceStatus = useMemo(() =>
    pace ? getSpendingPaceStatus(periodTotal, pace.expectedUsage) : null,
    [pace, periodTotal]
  );

  // For bar widths: normalize to max
  const maxCatTotal = categoryTotals[0]?.total || 1;

  // bar opacity levels per rank
  const barOpacity = ['1', '0.8', '0.6', '0.4'];

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-28 text-[#0F1424] antialiased">
      {/* Modern Frosted Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F8FAFC]/85 border-b border-black/[0.03]">
        <div className="flex justify-between items-center px-5 py-3.5 max-w-[768px] mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F1424] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#0F1424] tracking-tight leading-none">Insights</span>
              <span className="text-[10px] font-medium text-[#64748B] tracking-wide mt-0.5">Financial Analytics</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            aria-label="Settings"
            className="w-9 h-9 rounded-full bg-white ring-1 ring-black/[0.06] flex items-center justify-center text-[#64748B] hover:text-[#0F1424] hover:shadow-xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[19px]">settings</span>
          </button>
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-3 space-y-4 pb-6">
        {/* View Mode Toggle & Navigation */}
        <div className="flex flex-col gap-3 pt-1">
          {/* Segmented Control */}
          {!isCalendarOnly && (
            <div className="flex items-center bg-white p-1 rounded-2xl ring-1 ring-black/[0.05] shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('cycle')}
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
                onClick={() => setViewMode('month')}
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

          {/* Period Navigator Pill */}
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-2xl ring-1 ring-black/[0.05] shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous period"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0F1424] hover:bg-[#F8FAFC] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">date_range</span>
              <span className="text-xs sm:text-sm font-bold text-[#0F1424] tracking-tight">
                {viewMode === 'cycle' ? activeCycle.label : formatYearMonth(yearMonth)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next period"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0F1424] hover:bg-[#F8FAFC] active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        {periodTotal === 0 ? (
          <EmptyState
            emoji="📊"
            title="No data for this period"
            description="Add some expenses to see your spending insights."
            actionLabel="+ Add Expense"
            onAction={() => navigate('/add')}
          />
        ) : (
          <>
            {/* Period Summary Card: Modern Editorial Style */}
            <section className="bg-white rounded-[26px] p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col gap-5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    {viewMode === 'cycle' ? 'Cycle Total Spent' : 'Monthly Total Spent'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-base font-semibold text-[#64748B] tracking-wider">RM</span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#0F1424] tracking-tight tabular-nums">
                      {Math.floor(periodTotal / 100).toLocaleString('en-MY')}
                    </span>
                    <span className="text-xl font-semibold text-[#64748B] tabular-nums">
                      .{String(periodTotal % 100).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/50">
                  {periodExpenses.length} transactions
                </span>
              </div>

              {/* Bento Metrics Sub-grid */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#F8FAFC]">
                <div className="bg-[#F8FAFC] rounded-[18px] p-3.5 ring-1 ring-black/[0.03] flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Daily Avg</span>
                  <span className="text-base sm:text-lg font-bold text-[#0F1424] tabular-nums">
                    {formatCurrency(avgDaily)}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">Variable daily rate</span>
                </div>
                <div className="bg-[#F8FAFC] rounded-[18px] p-3.5 ring-1 ring-black/[0.03] flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Top Category</span>
                  {topCategory ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl flex-shrink-0">{catMap[topCategory.categoryId]?.icon || '📦'}</span>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[#0F1424] block truncate">
                          {catMap[topCategory.categoryId]?.name}
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600">
                          {topCategory.percentage.toFixed(0)}% of total
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#64748B]">—</span>
                  )}
                </div>
              </div>
            </section>

            {/* Spending Pace + Estimated */}
            {isCurrentPeriod && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pace && paceStatus && (
                  <div className="bg-white rounded-[22px] p-5 ring-1 ring-black/[0.05] shadow-2xs flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Spending Pace</span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px]">speed</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0F1424]">{PACE_LABELS[paceStatus].text}</h3>
                      <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{PACE_LABELS[paceStatus].sub}</p>
                      {fixedTotalThisPeriod > 0 && (
                        <p className="text-[10px] text-[#94A3B8] mt-2.5 pt-2 border-t border-[#F8FAFC]">
                          Excluded recurring: {formatCurrency(fixedTotalThisPeriod)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {estimated != null && (
                  <div className="bg-white rounded-[22px] p-5 ring-1 ring-black/[0.05] shadow-2xs flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                        {viewMode === 'cycle' ? 'Est. Cycle End' : 'Est. Month End'}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px]">event_upcoming</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#0F1424] tabular-nums">{formatCurrency(estimated)}</h3>
                      <p className="text-xs text-[#64748B] mt-1">Projected at current burn pace</p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Category Breakdown (Modern Capsule Progress Bars) */}
            <section className="bg-white rounded-[26px] p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-bold text-[#0F1424] tracking-tight">Category Breakdown</h3>
                  <p className="text-xs text-[#64748B]">Distribution across spending categories</p>
                </div>
                <span className="text-xs font-semibold text-[#64748B]">{categoryPcts.length} active</span>
              </div>

              <div className="space-y-4">
                {categoryPcts.map((ct) => {
                  const cat = catMap[ct.categoryId];
                  const barWidth = ((ct.total / maxCatTotal) * 100).toFixed(1);
                  const hasBudget = !!cat?.budgetInCents;
                  const isOverBudget = hasBudget && ct.total > cat.budgetInCents;
                  const isNearBudget = hasBudget && ct.total / cat.budgetInCents >= 0.8 && !isOverBudget;

                  return (
                    <div key={ct.categoryId} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-sm flex-shrink-0">
                            {cat?.icon || '📦'}
                          </span>
                          <span className="font-bold text-[#0F1424] truncate">{cat?.name || ct.categoryId}</span>
                        </div>
                        {hasBudget ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={isOverBudget ? 'text-rose-600' : 'text-[#0F1424]'}>
                              {formatCurrency(ct.total)} / {formatCurrency(cat.budgetInCents)}
                            </span>
                            {isOverBudget ? (
                              <span className="text-[10px] bg-rose-50 text-rose-700 ring-1 ring-rose-200 px-1.5 py-0.5 rounded-full font-bold">
                                Over
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#64748B]">
                                ({Math.round((ct.total / cat.budgetInCents) * 100)}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0F1424] tabular-nums">
                              {formatCurrency(ct.total)}
                            </span>
                            <span className="text-xs text-[#64748B] font-medium tabular-nums">
                              {ct.percentage.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Capsule track */}
                      <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden p-0.5 ring-1 ring-black/[0.02]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isOverBudget
                              ? 'bg-rose-500'
                              : isNearBudget
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-[#0F1424] to-[#2D3359]'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Period Comparison (Modern Column Chart) */}
            <section className="bg-white rounded-[26px] p-6 ring-1 ring-black/[0.05] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-bold text-[#0F1424] tracking-tight">
                    {viewMode === 'cycle' ? 'Cycle Comparison' : 'Monthly Comparison'}
                  </h3>
                  <p className="text-xs text-[#64748B]">Comparing total spend vs previous period</p>
                </div>
              </div>

              {comparison.direction === 'no-data' ? (
                <p className="text-xs text-[#64748B] py-4 text-center">
                  No data available for the previous {viewMode === 'cycle' ? 'cycle' : 'month'}.
                </p>
              ) : (
                <>
                  <div className="flex items-end justify-center h-44 gap-12 pt-4 pb-2">
                    {(() => {
                      const maxH = Math.max(prevPeriodTotal, periodTotal) || 1;
                      const prevH = Math.max(12, Math.round((prevPeriodTotal / maxH) * 100));
                      const curH = Math.max(12, Math.round((periodTotal / maxH) * 100));
                      return (
                        <>
                          {/* Previous Column */}
                          <div className="flex flex-col items-center gap-2.5 w-24">
                            <span className="text-[11px] font-bold text-[#64748B] tabular-nums">
                              {formatCurrency(prevPeriodTotal)}
                            </span>
                            <div className="w-full h-32 flex items-end">
                              <div
                                className="w-full bg-[#E2E8F0] rounded-xl transition-all duration-700 hover:opacity-90"
                                style={{ height: `${prevH}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-[#64748B] text-center truncate w-full">
                              Previous
                            </span>
                          </div>

                          {/* Current Column */}
                          <div className="flex flex-col items-center gap-2.5 w-24">
                            <span className="text-[11px] font-bold text-[#0F1424] tabular-nums">
                              {formatCurrency(periodTotal)}
                            </span>
                            <div className="w-full h-32 flex items-end">
                              <div
                                className="w-full bg-gradient-to-t from-[#0F1424] to-[#1E2746] rounded-xl transition-all duration-700 shadow-sm"
                                style={{ height: `${curH}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-[#0F1424] text-center truncate w-full">
                              Current
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#F8FAFC] flex items-center justify-center gap-2 text-xs text-[#64748B]">
                    <span className={`material-symbols-outlined text-[16px] ${
                      comparison.direction === 'up' ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {comparison.direction === 'up' ? 'trending_up' : 'trending_down'}
                    </span>
                    <span>
                      {comparison.direction === 'up'
                        ? `Spent ${comparison.changePercent?.toFixed(0)}% more than previous period.`
                        : comparison.direction === 'down'
                        ? `Spent ${comparison.changePercent?.toFixed(0)}% less than previous period.`
                        : `Same spending as previous period.`}
                    </span>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
