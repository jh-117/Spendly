import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

// Map DB snake_case row → JS camelCase object
function fromRow(row) {
  const rawDesc = row.description || '';
  const isClaimed = Boolean(
    row.is_claimed ||
    rawDesc.startsWith('[Claimed] ') ||
    rawDesc === '[Claimed]'
  );
  const cleanDesc = rawDesc.startsWith('[Claimed] ')
    ? rawDesc.slice(10)
    : (rawDesc === '[Claimed]' ? '' : rawDesc);

  return {
    id: row.id,
    amountInCents: Number(row.amount_in_cents),
    categoryId: row.category_id,
    description: cleanDesc,
    rawDescription: rawDesc,
    paymentMethod: row.payment_method || null,
    expenseDate: row.expense_date,
    isClaimed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) {
      console.error('Failed to load expenses:', error);
    } else {
      setExpenses((data || []).map(fromRow));
    }
    setLoading(false);
  }, []);

  // Fetch all expenses from Supabase on mount and listen to realtime changes
  useEffect(() => {
    fetchExpenses();

    // Use unique channel topic per subscription to avoid Supabase duplicate channel collisions
    const channelId = `realtime_expenses_${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchExpenses();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchExpenses);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchExpenses);
    };
  }, [fetchExpenses]);

  const addExpense = useCallback(async ({ amountInCents, categoryId, description, paymentMethod, expenseDate, isClaimed = false }) => {
    const now = new Date().toISOString();
    const cleanDesc = (description || '').trim();
    const finalDesc = isClaimed ? `[Claimed] ${cleanDesc}`.trim() : cleanDesc;

    const row = {
      amount_in_cents: amountInCents,
      category_id: categoryId,
      description: finalDesc,
      payment_method: paymentMethod || null,
      expense_date: expenseDate || format(new Date(), 'yyyy-MM-dd'),
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase
      .from('expenses')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('Failed to add expense:', error);
      return null;
    }
    const expense = fromRow(data);
    setExpenses(prev => [expense, ...prev]);
    return expense;
  }, []);

  const updateExpense = useCallback(async (id, changes) => {
    const current = expenses.find(e => e.id === id);
    const isClaimed = changes.isClaimed !== undefined
      ? Boolean(changes.isClaimed)
      : Boolean(current?.isClaimed);

    const descToUse = changes.description !== undefined
      ? (changes.description || '').trim()
      : (current?.description || '').trim();

    const finalDesc = isClaimed ? `[Claimed] ${descToUse}`.trim() : descToUse;

    const updates = {
      updated_at: new Date().toISOString(),
      description: finalDesc,
    };
    if (changes.amountInCents !== undefined) updates.amount_in_cents = changes.amountInCents;
    if (changes.categoryId !== undefined) updates.category_id = changes.categoryId;
    if (changes.paymentMethod !== undefined) updates.payment_method = changes.paymentMethod;
    if (changes.expenseDate !== undefined) updates.expense_date = changes.expenseDate;

    const { error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Failed to update expense:', error);
      return;
    }
    setExpenses(prev =>
      prev.map(e =>
        e.id === id
          ? {
              ...e,
              ...changes,
              description: descToUse,
              isClaimed,
              updatedAt: updates.updated_at,
            }
          : e
      )
    );
  }, [expenses]);

  const toggleClaimed = useCallback(async (id) => {
    const target = expenses.find(e => e.id === id);
    if (!target) return;
    await updateExpense(id, { isClaimed: !target.isClaimed });
  }, [expenses, updateExpense]);

  const deleteExpense = useCallback(async (id) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Failed to delete expense:', error);
      return;
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearAllExpenses = useCallback(async () => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
    if (error) {
      console.error('Failed to clear expenses:', error);
      return;
    }
    setExpenses([]);
  }, []);

  return { expenses, loading, addExpense, updateExpense, deleteExpense, clearAllExpenses, toggleClaimed };
}
