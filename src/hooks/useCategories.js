import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CATEGORIES } from '../lib/constants';

// Map DB snake_case row → JS camelCase object
function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    isDefault: row.is_default,
    isActive: row.is_active,
    excludeFromAvg: row.exclude_from_avg,
    budgetInCents: row.budget_in_cents ? Number(row.budget_in_cents) : null,
    createdAt: row.created_at,
  };
}

export function useCategories() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Fetch categories from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });
      if (!cancelled) {
        if (error) {
          console.error('Failed to load categories:', error);
        } else if (data && data.length > 0) {
          setCategories(data.map(fromRow));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addCategory = useCallback(async ({ name, icon, excludeFromAvg = false, budgetInCents = null }) => {
    const row = {
      id: crypto.randomUUID(),
      name: name.trim(),
      icon,
      is_default: false,
      is_active: true,
      exclude_from_avg: excludeFromAvg,
      budget_in_cents: budgetInCents,
    };
    const { data, error } = await supabase
      .from('categories')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('Failed to add category:', error);
      return;
    }
    setCategories(prev => [...prev, fromRow(data)]);
  }, []);

  const updateCategory = useCallback(async (id, changes) => {
    const updates = {};
    if (changes.name !== undefined) updates.name = changes.name;
    if (changes.icon !== undefined) updates.icon = changes.icon;
    if (changes.isActive !== undefined) updates.is_active = changes.isActive;
    if (changes.excludeFromAvg !== undefined) updates.exclude_from_avg = changes.excludeFromAvg;
    if (changes.budgetInCents !== undefined) updates.budget_in_cents = changes.budgetInCents;

    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Failed to update category:', error);
      return;
    }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }, []);

  const toggleCategory = useCallback(async (id) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const newActive = !cat.isActive;
    const { error } = await supabase
      .from('categories')
      .update({ is_active: newActive })
      .eq('id', id);
    if (error) {
      console.error('Failed to toggle category:', error);
      return;
    }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, isActive: newActive } : c));
  }, [categories]);

  const resetCategories = useCallback(async () => {
    // Delete all non-default categories, then reset defaults
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('is_default', false);
    if (deleteError) console.error('Failed to delete custom categories:', deleteError);

    // Reset default categories to their original state
    for (const cat of DEFAULT_CATEGORIES) {
      await supabase
        .from('categories')
        .upsert({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          is_default: true,
          is_active: true,
          exclude_from_avg: cat.excludeFromAvg,
        });
    }
    setCategories(DEFAULT_CATEGORIES);
  }, []);

  return { categories, addCategory, updateCategory, toggleCategory, resetCategories };
}
