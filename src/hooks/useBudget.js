import { useState, useCallback } from 'react';
import { storage } from '../lib/storage';
import { DEFAULT_BUDGET } from '../lib/constants';
import { toCents } from '../lib/calculations';

export function useBudget() {
  const [budget, setBudgetState] = useState(() =>
    storage.get('budget', DEFAULT_BUDGET)
  );

  const setBudget = useCallback((amountStr) => {
    const cents = typeof amountStr === 'number'
      ? amountStr
      : toCents(String(amountStr).replace(/,/g, ''));
    const updated = {
      amountInCents: cents > 0 ? cents : null,
      updatedAt: new Date().toISOString(),
    };
    storage.set('budget', updated);
    setBudgetState(updated);
  }, []);

  const clearBudget = useCallback(() => {
    const cleared = { amountInCents: null, updatedAt: new Date().toISOString() };
    storage.set('budget', cleared);
    setBudgetState(cleared);
  }, []);

  return { budget, setBudget, clearBudget };
}
