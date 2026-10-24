import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_BUDGET } from '../lib/constants';
import { toCents } from '../lib/calculations';

export function useBudget() {
  const [budget, setBudgetState] = useState(DEFAULT_BUDGET);
  const [loading, setLoading] = useState(true);

  const fetchBudget = useCallback(async () => {
    const { data, error } = await supabase
      .from('budget')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) {
      console.error('Failed to load budget:', error);
    } else if (data) {
      setBudgetState({
        amountInCents: data.amount_in_cents ? Number(data.amount_in_cents) : null,
        updatedAt: data.updated_at,
      });
    }
    setLoading(false);
  }, []);

  // Fetch on mount, listen to realtime changes & window focus/visibility
  useEffect(() => {
    fetchBudget();

    // Supabase Realtime subscription for cross-device sync
    const channel = supabase
      .channel('realtime_budget')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budget' },
        (payload) => {
          if (payload.new) {
            setBudgetState({
              amountInCents: payload.new.amount_in_cents ? Number(payload.new.amount_in_cents) : null,
              updatedAt: payload.new.updated_at,
            });
          }
        }
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBudget();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchBudget);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchBudget);
    };
  }, [fetchBudget]);

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

  return { budget, loading, setBudget, clearBudget, refreshBudget: fetchBudget };
}
