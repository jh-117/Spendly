import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_BUDGET } from '../lib/constants';
import { toCents } from '../lib/calculations';

export function useBudget() {
  const [budget, setBudgetState] = useState(DEFAULT_BUDGET);

  // Fetch budget from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('budget')
        .select('*')
        .eq('id', 1)
        .single();
      if (!cancelled) {
        if (error) {
          console.error('Failed to load budget:', error);
        } else if (data) {
          setBudgetState({
            amountInCents: data.amount_in_cents ? Number(data.amount_in_cents) : null,
            updatedAt: data.updated_at,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setBudget = useCallback(async (amountStr) => {
    const cents = typeof amountStr === 'number'
      ? amountStr
      : toCents(String(amountStr).replace(/,/g, ''));
    const now = new Date().toISOString();
    const updated = {
      amountInCents: cents > 0 ? cents : null,
      updatedAt: now,
    };

    const { error } = await supabase
      .from('budget')
      .update({
        amount_in_cents: updated.amountInCents,
        updated_at: now,
      })
      .eq('id', 1);
    if (error) {
      console.error('Failed to save budget:', error);
      return;
    }
    setBudgetState(updated);
  }, []);

  const clearBudget = useCallback(async () => {
    const now = new Date().toISOString();
    const cleared = { amountInCents: null, updatedAt: now };

    const { error } = await supabase
      .from('budget')
      .update({
        amount_in_cents: null,
        updated_at: now,
      })
      .eq('id', 1);
    if (error) {
      console.error('Failed to clear budget:', error);
      return;
    }
    setBudgetState(cleared);
  }, []);

  return { budget, setBudget, clearBudget };
}
