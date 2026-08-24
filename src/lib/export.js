import { format } from 'date-fns';

/**
 * Export all expenses to a CSV file download.
 * Amounts are stored as cents, exported as decimal RM values.
 */
export function exportExpensesToCSV(expenses, categories) {
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c.name; });

  const sorted = [...expenses].sort((a, b) =>
    a.expenseDate.localeCompare(b.expenseDate)
  );

  const header = ['date', 'amount_rm', 'category', 'description', 'payment_method'];

  const rows = sorted.map(e => [
    e.expenseDate,
    (e.amountInCents / 100).toFixed(2),
    catMap[e.categoryId] || e.categoryId,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    e.paymentMethod || '',
  ]);

  const csvContent = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `spendly-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
