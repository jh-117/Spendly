import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getItemDueDateInCycle } from '../lib/calculations';

function fromRow(row) {
  return {
    id: row.id,
    amountInCents: Number(row.amount_in_cents),
    categoryId: row.category_id,
    description: row.description,
    paymentMethod: row.payment_method || null,
    dayOfMonth: Number(row.day_of_month || 1),
    isActive: row.is_active,
    lastLoggedMonth: row.last_logged_month,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useRecurringExpenses() {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('day_of_month', { ascending: true });
      if (!cancelled) {
        if (error) {
          console.error('Failed to load recurring expenses:', error);
        } else if (data) {
          setRecurringExpenses(data.map(fromRow));
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addRecurringExpense = useCallback(async ({ amountInCents, categoryId, description, paymentMethod, dayOfMonth = 1 }) => {
    const now = new Date().toISOString();
    const row = {
      amount_in_cents: amountInCents,
      category_id: categoryId,
      description: description.trim(),
      payment_method: paymentMethod || null,
      day_of_month: dayOfMonth,
      is_active: true,
      last_logged_month: null,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('Failed to add recurring expense:', error);
      return null;
    }
    const item = fromRow(data);
    setRecurringExpenses(prev => [...prev, item]);
    return item;
  }, []);

  const updateRecurringExpense = useCallback(async (id, changes) => {
    const updates = { updated_at: new Date().toISOString() };
    if (changes.amountInCents !== undefined) updates.amount_in_cents = changes.amountInCents;
    if (changes.categoryId !== undefined) updates.category_id = changes.categoryId;
    if (changes.description !== undefined) updates.description = changes.description.trim();
    if (changes.paymentMethod !== undefined) updates.payment_method = changes.paymentMethod;
    if (changes.dayOfMonth !== undefined) updates.day_of_month = changes.dayOfMonth;
    if (changes.isActive !== undefined) updates.is_active = changes.isActive;
    if (changes.lastLoggedMonth !== undefined) updates.last_logged_month = changes.lastLoggedMonth;

    const { error } = await supabase
      .from('recurring_expenses')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Failed to update recurring expense:', error);
      return;
    }
    setRecurringExpenses(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  }, []);

  const deleteRecurringExpense = useCallback(async (id) => {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Failed to delete recurring expense:', error);
      return;
    }
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleRecurringExpense = useCallback(async (id) => {
    const target = recurringExpenses.find(r => r.id === id);
    if (!target) return;
    const newActive = !target.isActive;
    await updateRecurringExpense(id, { isActive: newActive });
  }, [recurringExpenses, updateRecurringExpense]);

  // Check and auto-log due recurring items for current cycle / month
  const processDueRecurring = useCallback(async (addExpenseFn, currentCycle = null, existingExpenses = []) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    for (const item of recurringExpenses) {
      if (!item.isActive) continue;

      let dueDateStr;
      let cycleKey;

      if (currentCycle?.startDate && currentCycle?.endDate) {
        dueDateStr = getItemDueDateInCycle(item.dayOfMonth, currentCycle);
        cycleKey = currentCycle.startDate;
      } else {
        const currentYM = format(now, 'yyyy-MM');
        dueDateStr = `${currentYM}-${String(item.dayOfMonth).padStart(2, '0')}`;
        cycleKey = currentYM;
      }

      // Migration: old format was 'yyyy-MM', new format is cycle startDate 'yyyy-MM-dd'
      // If lastLoggedMonth is in old format and matches current cycle's month or dueDate, treat as already logged
      const lastLogged = item.lastLoggedMonth || '';
      const isOldFormatMatch = lastLogged.length === 7 && (
        (currentCycle?.startDate && currentCycle.startDate.startsWith(lastLogged)) ||
        (currentCycle?.endDate && currentCycle.endDate.startsWith(lastLogged)) ||
        (dueDateStr && dueDateStr.startsWith(lastLogged))
      );

      // Check if already present in existingExpenses to prevent double logging
      const alreadyPresent = existingExpenses.some(
        e => (e.description === `${item.description} (Recurring)` ||
              e.description === item.description) &&
             e.expenseDate >= (currentCycle?.startDate || `${format(now, 'yyyy-MM')}-01`) &&
             e.expenseDate <= (currentCycle?.endDate || `${format(now, 'yyyy-MM')}-31`)
      );

      // If due on or before today, hasn't been logged for this cycle key, and not already present
      if (dueDateStr && dueDateStr <= todayStr && item.lastLoggedMonth !== cycleKey && !isOldFormatMatch && !alreadyPresent) {
        await addExpenseFn({
          amountInCents: item.amountInCents,
          categoryId: item.categoryId,
          description: `${item.description} (Recurring)`,
          paymentMethod: item.paymentMethod,
          expenseDate: dueDateStr,
        });

        await updateRecurringExpense(item.id, { lastLoggedMonth: cycleKey });
      }
    }
  }, [recurringExpenses, updateRecurringExpense]);

  return {
    recurringExpenses,
    loading,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleRecurringExpense,
    processDueRecurring,
  };
}
