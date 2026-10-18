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
  const isCalendarOnly = cycleStartDay === 1;

  // View mode: 'cycle' or 'month'
  const [viewMode, setViewMode] = useState(isCalendarOnly ? 'month' : 'cycle');

  // Month navigation
  const today = useMemo(() => new Date(), []);
  const currentYM = toYearMonth(today);
  const [yearMonth, setYearMonth] = useState(currentYM);

  // Cycle navigation
  const currentCycle = useMemo(() => getBillingCycle(today, cycleStartDay), [today, cycleStartDay]);
  const [activeCycle, setActiveCycle] = useState(() => getBillingCycle(today, cycleStartDay));

  const isCurrentPeriod = viewMode === 'cycle'
    ? activeCycle.isCurrentCycle
    : yearMonth === currentYM;

  const canGoNext = viewMode === 'cycle'
    ? activeCycle.startDate < currentCycle.startDate
    : yearMonth < currentYM;

  const prevYM = getPreviousYearMonth(yearMonth);

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
      return getPreviousCycle(activeCycle, cycleStartDay);
    }
    return prevYM;
  }, [viewMode, activeCycle, cycleStartDay, prevYM]);

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

      <main className="max-w-[768px] mx-auto px-5 space-y-4 pb-6">
        {/* Page title */}
        <div className="pt-2 pb-1">
          <h2 className="text-display-hero text-[#181d3a] mb-2">Insights</h2>
          
          {/* View Mode Toggle (Pay Cycle vs Calendar Month) */}
          {!isCalendarOnly && (
            <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-[#e2e2e2] shadow-xs mb-3">
              <button
                onClick={() => setViewMode('cycle')}
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
                onClick={() => setViewMode('month')}
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

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-1 text-[#64748B] hover:text-[#181d3a] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <p className="text-body-sm font-semibold text-[#181d3a]">
              {viewMode === 'cycle' ? activeCycle.label : formatYearMonth(yearMonth)}
            </p>
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="p-1 text-[#64748B] hover:text-[#181d3a] active:scale-95 transition-all disabled:opacity-30"
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
            {/* Period Summary Card */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e2e2] flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#181d3a]/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
              <div className="flex flex-col gap-1">
                <span className="text-body-sm text-[#64748B]">
                  {viewMode === 'cycle' ? 'Cycle Total Spent' : 'Monthly Total Spent'}
                </span>
                <span className="text-headline-lg text-[#181d3a]">{formatCurrency(periodTotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F8FAFC] rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-label-caps text-[#64748B] uppercase">Daily Avg</span>
                  <span className="text-body-md text-[#181d3a] font-semibold">{formatCurrency(avgDaily)}</span>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 flex flex-col gap-1">
                  <span className="text-label-caps text-[#64748B] uppercase">Top Category</span>
                  {topCategory ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{catMap[topCategory.categoryId]?.icon || '📦'}</span>
                      <span className="text-body-md text-[#181d3a] font-semibold">
                        {catMap[topCategory.categoryId]?.name} {topCategory.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-body-md text-[#64748B]">—</span>
                  )}
                </div>
              </div>
            </section>

            {/* Spending Pace + Estimated */}
            {isCurrentPeriod && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pace && paceStatus && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e2e2] flex flex-col justify-between min-h-[140px]">
                    <div className="flex justify-between items-start">
                      <span className="text-body-md text-[#64748B]">Spending Pace</span>
                      <div className="p-2 bg-[#F8FAFC] rounded-full">
                        <span className="material-symbols-outlined text-[#181d3a] text-sm">speed</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-headline-lg-mobile text-[#181d3a]">{PACE_LABELS[paceStatus].text}</h3>
                      <p className="text-body-sm text-[#64748B] mt-1">{PACE_LABELS[paceStatus].sub}</p>
                      {fixedTotalThisPeriod > 0 && (
                        <p className="text-[11px] text-[#64748B] mt-2 pt-2 border-t border-[#f3f3f3]">
                          Excluded categories contributed {formatCurrency(fixedTotalThisPeriod)} to your total spending.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {estimated != null && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e2e2] flex flex-col justify-between min-h-[140px]">
                    <div className="flex justify-between items-start">
                      <span className="text-body-md text-[#64748B]">
                        {viewMode === 'cycle' ? 'Est. End of Cycle' : 'Est. End of Month'}
                      </span>
                      <div className="p-2 bg-[#F8FAFC] rounded-full">
                        <span className="material-symbols-outlined text-[#181d3a] text-sm">event_upcoming</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-headline-lg-mobile text-[#181d3a]">{formatCurrency(estimated)}</h3>
                      <p className="text-body-sm text-[#64748B] mt-1">Estimated at current spending pace</p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Category Breakdown */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e2e2]">
              <h3 className="text-body-md text-[#181d3a] font-semibold mb-6">Category Breakdown</h3>
              <div className="space-y-4">
                {categoryPcts.map((ct, idx) => {
                  const cat = catMap[ct.categoryId];
                  const barWidth = ((ct.total / maxCatTotal) * 100).toFixed(1);
                  return (
                    <div key={ct.categoryId} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-body-sm">
                        <div className="flex items-center gap-2">
                          <span>{cat?.icon || '📦'}</span>
                          <span className="text-[#1a1c1c]">{cat?.name || ct.categoryId}</span>
                        </div>
                        <span className="text-[#64748B]">
                          {ct.percentage.toFixed(0)}% ({formatCurrency(ct.total)})
                        </span>
                      </div>
                      <div className="w-full bg-[#F8FAFC] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: '#181d3a',
                            opacity: barOpacity[Math.min(idx, barOpacity.length - 1)],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Period Comparison */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e2e2e2]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-body-md text-[#181d3a] font-semibold">
                  {viewMode === 'cycle' ? 'Cycle vs Cycle' : 'Month vs Month'}
                </h3>
              </div>
              {comparison.direction === 'no-data' ? (
                <p className="text-body-sm text-[#64748B]">
                  No data for previous {viewMode === 'cycle' ? 'cycle' : 'month'}.
                </p>
              ) : (
                <>
                  <div className="flex items-end justify-center h-40 gap-8 mb-4">
                    {/* Previous period bar */}
                    {(() => {
                      const maxH = Math.max(prevPeriodTotal, periodTotal) || 1;
                      const prevH = Math.round((prevPeriodTotal / maxH) * 100);
                      const curH = Math.round((periodTotal / maxH) * 100);
                      return (
                        <>
                          <div className="flex flex-col items-center gap-2 w-20">
                            <div
                              className="w-full bg-[#e2e2e2] rounded-t-xl transition-all duration-500"
                              style={{ height: `${prevH}%` }}
                            />
                            <span className="text-[11px] text-[#64748B] text-center truncate w-full">
                              {viewMode === 'cycle'
                                ? (typeof prevPeriod === 'object' ? prevPeriod.shortLabel : prevPeriod)
                                : formatYearMonth(prevPeriod).split(' ')[0].slice(0, 3)}
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-2 w-20 group relative">
                            <div
                              className="w-full bg-[#181d3a] rounded-t-xl transition-all duration-500"
                              style={{ height: `${curH}%` }}
                            />
                            <span className="text-[11px] text-[#181d3a] font-semibold text-center truncate w-full">
                              {viewMode === 'cycle'
                                ? activeCycle.shortLabel
                                : formatYearMonth(yearMonth).split(' ')[0].slice(0, 3)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-center text-body-sm text-[#64748B] pt-4 border-t border-[#e2e2e2]">
                    {comparison.direction === 'up'
                      ? `You've spent ${comparison.changePercent?.toFixed(0)}% more than last ${viewMode === 'cycle' ? 'cycle' : 'month'}.`
                      : comparison.direction === 'down'
                      ? `You've spent ${comparison.changePercent?.toFixed(0)}% less than last ${viewMode === 'cycle' ? 'cycle' : 'month'}.`
                      : `Same spending as last ${viewMode === 'cycle' ? 'cycle' : 'month'}.`}
                  </p>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
