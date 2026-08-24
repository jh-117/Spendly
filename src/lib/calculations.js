import { getDaysInMonth, format, parseISO, isValid } from 'date-fns';
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

/** Budget remaining (can be negative) */
export function getBudgetRemaining(monthlyTotal, budgetAmountInCents) {
  if (budgetAmountInCents == null) return null;
  return budgetAmountInCents - monthlyTotal;
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
export function getEstimatedMonthlySpending(averageDailySpendingCents, yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDays = getDaysInMonth(new Date(year, month - 1));
  return averageDailySpendingCents * totalDays;
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
