import {
  getDaysInMonth,
  format,
  parseISO,
  isValid,
  addDays,
  subDays,
  addMonths,
  subMonths,
  differenceInCalendarDays,
} from 'date-fns';
import { CURRENCY_SYMBOL } from './constants';

// ─── Formatting ────────────────────────────────────────────────────────────

/** Convert integer cents to "RM 12.50" */
export function formatCurrency(cents) {
  if (cents == null) return `${CURRENCY_SYMBOL} 0.00`;
  const amount = cents / 100;
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "YYYY-MM" string for a given Date */
export function toYearMonth(date) {
  return format(date, 'yyyy-MM');
}

// ─── Filtering helpers ──────────────────────────────────────────────────────

/** Filter expenses to a specific "YYYY-MM" month */
export function filterByMonth(expenses, yearMonth) {
  return expenses.filter(e => e.expenseDate.startsWith(yearMonth));
}

/** Filter expenses to a specific "YYYY-MM-DD" date */
export function filterByDate(expenses, dateStr) {
  return expenses.filter(e => e.expenseDate === dateStr);
}

/** Filter expenses within an inclusive date range [startDate, endDate] (YYYY-MM-DD) */
export function filterByDateRange(expenses, startDate, endDate) {
  return expenses.filter(e => e.expenseDate >= startDate && e.expenseDate <= endDate);
}

// ─── Billing / Salary Cycle calculations ─────────────────────────────────────

/**
 * Calculates the actual payday date for a given year and month.
 * If targetDay > 1 and adjustForWeekend is true:
 * - Saturday (6) -> shift back 1 day to Friday
 * - Sunday (0) -> shift back 2 days to Friday
 */
export function getAdjustedPayday(year, month, targetDay = 25, adjustForWeekend = true) {
  const daysInMonth = getDaysInMonth(new Date(year, month, 1));
  const validDay = Math.min(targetDay, daysInMonth);
  const date = new Date(year, month, validDay);

  if (!adjustForWeekend || targetDay === 1) {
    return date;
  }

  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0) {
    return subDays(date, 2); // Sunday -> Friday
  } else if (dayOfWeek === 6) {
    return subDays(date, 1); // Saturday -> Friday
  }
  return date;
}

/**
 * Returns billing cycle descriptor for a given date and cycle start day.
 * When cycleStartDay === 1, aligns with standard calendar month.
 * When cycleStartDay > 1 (e.g. 25): runs from payday of month to the day before next payday.
 * If adjustWeekend is true and payday falls on Sat/Sun, shifts to previous Friday.
 */
export function getBillingCycle(dateInput = new Date(), cycleStartDay = 25, adjustWeekend = true) {
  const d = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
  const year = d.getFullYear();
  const month = d.getMonth();

  let startDate;
  let endDate;

  if (cycleStartDay === 1) {
    startDate = new Date(year, month, 1);
    const totalDays = getDaysInMonth(startDate);
    endDate = new Date(year, month, totalDays);
  } else {
    // Current month's adjusted payday
    const thisMonthPayday = getAdjustedPayday(year, month, cycleStartDay, adjustWeekend);
    const dStr = format(d, 'yyyy-MM-dd');
    const thisPaydayStr = format(thisMonthPayday, 'yyyy-MM-dd');

    if (dStr >= thisPaydayStr) {
      // Cycle started in current calendar month on adjusted payday
      startDate = thisMonthPayday;
      const nextMonth = addMonths(new Date(year, month, 1), 1);
      const nextMonthPayday = getAdjustedPayday(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        cycleStartDay,
        adjustWeekend
      );
      endDate = subDays(nextMonthPayday, 1);
    } else {
      // Cycle started in previous calendar month on adjusted payday
      const prevMonth = subMonths(new Date(year, month, 1), 1);
      const prevMonthPayday = getAdjustedPayday(
        prevMonth.getFullYear(),
        prevMonth.getMonth(),
        cycleStartDay,
        adjustWeekend
      );
      startDate = prevMonthPayday;
      endDate = subDays(thisMonthPayday, 1);
    }
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  const now = new Date();
  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;
  const isCurrentCycle = now >= startDate && now <= endDate;
  const daysPassed = isCurrentCycle
    ? Math.max(1, Math.min(totalDays, differenceInCalendarDays(now, startDate) + 1))
    : totalDays;
  const daysRemaining = isCurrentCycle
    ? Math.max(0, differenceInCalendarDays(endDate, now) + 1)
    : 0;

  return {
    startDate: startStr,
    endDate: endStr,
    cycleStartDay,
    adjustWeekend,
    label: `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM yyyy')}`,
    shortLabel: `${format(startDate, 'd MMM')} – ${format(endDate, 'd MMM')}`,
    totalDays,
    daysPassed,
    daysRemaining,
    isCurrentCycle,
    nextPayday: format(addDays(endDate, 1), 'd MMM'),
    nextPaydayDate: format(addDays(endDate, 1), 'yyyy-MM-dd'),
  };
}

/** Get previous billing cycle */
export function getPreviousCycle(cycle, cycleStartDay = 25, adjustWeekend = true) {
  const prevDate = subDays(parseISO(cycle.startDate), 1);
  return getBillingCycle(prevDate, cycleStartDay, adjustWeekend);
}

/** Get next billing cycle */
export function getNextCycle(cycle, cycleStartDay = 25, adjustWeekend = true) {
  const nextDate = addDays(parseISO(cycle.endDate), 1);
  return getBillingCycle(nextDate, cycleStartDay, adjustWeekend);
}

/** Sum amountInCents for a cycle range */
export function getCycleTotal(expenses, startDate, endDate) {
  return filterByDateRange(expenses, startDate, endDate)
    .reduce((sum, e) => sum + e.amountInCents, 0);
}

/** Average daily spending in a cycle */
export function getCycleAverageDailySpending(expenses, cycle, isCurrentCycle = true) {
  const total = getCycleTotal(expenses, cycle.startDate, cycle.endDate);
  const divisor = isCurrentCycle ? cycle.daysPassed : cycle.totalDays;
  return divisor > 0 ? Math.round(total / divisor) : 0;
}

/**
 * Calculates the exact 'yyyy-MM-dd' due date for a recurring day of month within a cycle.
 */
export function getItemDueDateInCycle(dayOfMonth, cycle) {
  if (!cycle?.startDate || !cycle?.endDate) return null;
  const start = parseISO(cycle.startDate);
  const end = parseISO(cycle.endDate);

  const makeDate = (year, month, targetDay) => {
    const maxDays = getDaysInMonth(new Date(year, month, 1));
    const day = Math.min(Math.max(1, targetDay), maxDays);
    return new Date(year, month, day);
  };

  const cand1 = makeDate(start.getFullYear(), start.getMonth(), dayOfMonth);
  const cand1Str = format(cand1, 'yyyy-MM-dd');
  if (cand1Str >= cycle.startDate && cand1Str <= cycle.endDate) {
    return cand1Str;
  }

  const cand2 = makeDate(end.getFullYear(), end.getMonth(), dayOfMonth);
  const cand2Str = format(cand2, 'yyyy-MM-dd');
  if (cand2Str >= cycle.startDate && cand2Str <= cycle.endDate) {
    return cand2Str;
  }

  return cand1Str;
}

/** Safe to spend per remaining day in cycle */
export function getCycleSafeToSpend(budgetAmountInCents, cycleTotalCents, cycle, pendingRecurringCents = 0) {
  if (!budgetAmountInCents) return null;
  const remainingBudget = budgetAmountInCents - cycleTotalCents - pendingRecurringCents;
  if (cycle.daysRemaining <= 0) return 0;
  return remainingBudget > 0 ? Math.floor(remainingBudget / cycle.daysRemaining) : 0;
}

/** Budget pace for a cycle */
export function getCycleBudgetPace(budgetAmountInCents, cycle) {
  if (!budgetAmountInCents) return null;
  const expectedUsage = Math.round((budgetAmountInCents * cycle.daysPassed) / cycle.totalDays);
  return { expectedUsage, totalDays: cycle.totalDays, currentDay: cycle.daysPassed, budgetAmountInCents };
}

/** Estimated total spending at current cycle pace */
export function getEstimatedCycleSpending(averageDailySpendingCents, cycle, totalFixedCents = 0) {
  return (averageDailySpendingCents * cycle.totalDays) + totalFixedCents;
}

// ─── Core calculations ──────────────────────────────────────────────────────

/** Sum amountInCents for a set of expenses */
export function getMonthlyTotal(expenses, yearMonth) {
  return filterByMonth(expenses, yearMonth)
    .reduce((sum, e) => sum + e.amountInCents, 0);
}

/** Sum amountInCents for a specific date */
export function getDailyTotal(expenses, dateStr) {
  return filterByDate(expenses, dateStr)
    .reduce((sum, e) => sum + e.amountInCents, 0);
}

/** Average daily spending for the current (in-progress) month */
export function getCurrentMonthAverageDailySpending(expenses, yearMonth, today) {
  const total = getMonthlyTotal(expenses, yearMonth);
  const daysPassed = today.getDate();
  return daysPassed > 0 ? Math.round(total / daysPassed) : 0;
}

/** Average daily spending for a completed past month */
export function getCompletedMonthAverageDailySpending(expenses, yearMonth) {
  const total = getMonthlyTotal(expenses, yearMonth);
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(year, month - 1));
  return totalDays > 0 ? Math.round(total / totalDays) : 0;
}

/** Budget remaining (can be negative, accounts for pending reserved recurring bills) */
export function getBudgetRemaining(monthlyTotal, budgetAmountInCents, pendingRecurringCents = 0) {
  if (budgetAmountInCents == null) return null;
  return budgetAmountInCents - monthlyTotal - pendingRecurringCents;
}

/** 0-100 percentage of budget used, null if no budget set */
export function getBudgetUsedPercentage(monthlyTotal, budgetAmountInCents) {
  if (!budgetAmountInCents || budgetAmountInCents <= 0) return null;
  return (monthlyTotal / budgetAmountInCents) * 100;
}

/** Expected vs actual spending pace */
export function getBudgetPace(budgetAmountInCents, yearMonth, today) {
  if (!budgetAmountInCents) return null;
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(year, month - 1));
  const currentDay = today.getDate();
  const expectedUsage = Math.round((budgetAmountInCents * currentDay) / totalDays);
  return { expectedUsage, totalDays, currentDay, budgetAmountInCents };
}

export function getDaysRemaining(yearMonth, today) {
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(year, month - 1));
  const currentDay = today.getDate();
  return Math.max(0, totalDays - currentDay + 1); // +1 to include today
}

export function getSafeToSpend(budgetAmountInCents, monthlyTotalCents, yearMonth, today) {
  if (!budgetAmountInCents) return null;
  const remainingBudget = budgetAmountInCents - monthlyTotalCents;
  const daysRemaining = getDaysRemaining(yearMonth, today);
  if (daysRemaining <= 0) return 0;
  return remainingBudget > 0 ? Math.floor(remainingBudget / daysRemaining) : 0;
}

/**
 * "below" | "near" | "above"
 * ±5% threshold around expected pace
 */
export function getSpendingPaceStatus(actualUsage, expectedUsage) {
  if (!expectedUsage || expectedUsage === 0) return 'near';
  const diffPct = ((actualUsage - expectedUsage) / expectedUsage) * 100;
  if (diffPct < -5) return 'below';
  if (diffPct > 5) return 'above';
  return 'near';
}

/** Group by categoryId and sum amountInCents → [{categoryId, total}] */
export function getCategoryTotals(expenses) {
  const map = {};
  for (const e of expenses) {
    map[e.categoryId] = (map[e.categoryId] || 0) + e.amountInCents;
  }
  return Object.entries(map)
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
}

/** Attach percentage to each category total entry */
export function getCategoryPercentages(categoryTotals, monthlyTotal) {
  if (!monthlyTotal) return categoryTotals.map(ct => ({ ...ct, percentage: 0 }));
  return categoryTotals.map(ct => ({
    ...ct,
    percentage: (ct.total / monthlyTotal) * 100,
  }));
}

/** Top spending category {categoryId, total, percentage} or null */
export function getTopSpendingCategory(categoryTotals, monthlyTotal) {
  if (!categoryTotals.length) return null;
  const top = categoryTotals[0];
  return {
    ...top,
    percentage: monthlyTotal ? (top.total / monthlyTotal) * 100 : 0,
  };
}

/**
 * Month-over-month comparison
 * Returns { changePercent, direction } or null if no previous data
 */
export function getMonthComparison(currentMonthTotal, previousMonthTotal) {
  if (!previousMonthTotal || previousMonthTotal === 0) {
    return { changePercent: null, direction: 'no-data' };
  }
  const changePercent = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
  return {
    changePercent: Math.abs(changePercent),
    direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'same',
    currentMonthTotal,
    previousMonthTotal,
  };
}

/** Estimated end-of-month spend based on current daily average */
export function getEstimatedMonthlySpending(averageDailySpendingCents, yearMonth, totalFixedCents = 0) {
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(year, month - 1));
  return (averageDailySpendingCents * totalDays) + totalFixedCents;
}

/** Day with highest total spending → { date, total } or null */
export function getHighestSpendingDay(expenses) {
  if (!expenses.length) return null;
  const byDate = {};
  for (const e of expenses) {
    byDate[e.expenseDate] = (byDate[e.expenseDate] || 0) + e.amountInCents;
  }
  const sorted = Object.entries(byDate).sort(([, a], [, b]) => b - a);
  if (!sorted.length) return null;
  return { date: sorted[0][0], total: sorted[0][1] };
}

/** Has at least one expense been recorded on the given date string */
export function hasRecordedToday(expenses, todayStr) {
  return expenses.some(e => e.expenseDate === todayStr);
}

/** Get top N most-frequently-used categories */
export function getFrequentCategories(expenses, n = 3) {
  const freq = {};
  for (const e of expenses) {
    freq[e.categoryId] = (freq[e.categoryId] || 0) + 1;
  }
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([categoryId]) => categoryId);
}

/** Previous month string "YYYY-MM" */
export function getPreviousYearMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return format(d, 'yyyy-MM');
}

/** Convert dollar string input to cents integer */
export function toCents(amountStr) {
  const parsed = parseFloat(amountStr);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/** Convert cents integer to display string "12.50" (no symbol) */
export function fromCents(cents) {
  return (cents / 100).toFixed(2);
}

/** Format date string for display */
export function formatExpenseDate(dateStr, today) {
  if (!dateStr) return '';
  const todayStr = format(today || new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(new Date().setDate(new Date().getDate() - 1)), 'yyyy-MM-dd');
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  try {
    const d = parseISO(dateStr);
    if (isValid(d)) return format(d, 'MMM d');
    return dateStr;
  } catch {
    return dateStr;
  }
}

/** Format YYYY-MM to "August 2026" */
export function formatYearMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}
