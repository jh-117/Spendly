import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { storage } from '../lib/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState(() => storage.get('expenses', []));

  const save = useCallback((updated) => {
    storage.set('expenses', updated);
    setExpenses(updated);
  }, []);

  const addExpense = useCallback(({ amountInCents, categoryId, description, paymentMethod, expenseDate }) => {
    const now = new Date().toISOString();
    const expense = {
      id: uuidv4(),
      amountInCents,
      categoryId,
      description: description || '',
      paymentMethod: paymentMethod || null,
      expenseDate: expenseDate || format(new Date(), 'yyyy-MM-dd'),
      createdAt: now,
      updatedAt: now,
    };
    save([...expenses, expense]);
    return expense;
  }, [expenses, save]);

  const updateExpense = useCallback((id, changes) => {
    save(
      expenses.map(e =>
        e.id === id
          ? { ...e, ...changes, updatedAt: new Date().toISOString() }
          : e
      )
    );
  }, [expenses, save]);

  const deleteExpense = useCallback((id) => {
    save(expenses.filter(e => e.id !== id));
  }, [expenses, save]);

  const clearAllExpenses = useCallback(() => {
    save([]);
  }, [save]);

  return { expenses, addExpense, updateExpense, deleteExpense, clearAllExpenses };
}
