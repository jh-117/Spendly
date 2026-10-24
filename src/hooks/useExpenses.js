import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

// Map DB snake_case row → JS camelCase object
function fromRow(row) {
  return {
    id: row.id,
    amountInCents: Number(row.amount_in_cents),
    categoryId: row.category_id,
    description: row.description || '',
    paymentMethod: row.payment_method || null,
    expenseDate: row.expense_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all expenses from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (!cancelled) {
        if (error) {
          console.error('Failed to load expenses:', error);
        } else {
          setExpenses((data || []).map(fromRow));
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addExpense = useCallback(async ({ amountInCents, categoryId, description, paymentMethod, expenseDate }) => {
    const now = new Date().toISOString();
    const row = {
      amount_in_cents: amountInCents,
      category_id: categoryId,
      description: description || '',
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
    const updates = { updated_at: new Date().toISOString() };
    if (changes.amountInCents !== undefined) updates.amount_in_cents = changes.amountInCents;
    if (changes.categoryId !== undefined) updates.category_id = changes.categoryId;
    if (changes.description !== undefined) updates.description = changes.description;
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
          ? { ...e, ...changes, updatedAt: updates.updated_at }
          : e
      )
    );
  }, []);

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

  return { expenses, loading, addExpense, updateExpense, deleteExpense, clearAllExpenses };
}
