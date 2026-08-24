import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../lib/storage';
import { DEFAULT_CATEGORIES } from '../lib/constants';

function seedCategories() {
  const existing = storage.get('categories', null);
  if (!existing) {
    storage.set('categories', DEFAULT_CATEGORIES);
  }
  return storage.get('categories', DEFAULT_CATEGORIES);
}

export function useCategories() {
  const [categories, setCategories] = useState(() => seedCategories());

  const save = useCallback((updated) => {
    storage.set('categories', updated);
    setCategories(updated);
  }, []);

  const addCategory = useCallback(({ name, icon }) => {
    const newCat = {
      id: uuidv4(),
      name: name.trim(),
      icon,
      isDefault: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    save([...categories, newCat]);
  }, [categories, save]);

  const updateCategory = useCallback((id, changes) => {
    save(categories.map(c => c.id === id ? { ...c, ...changes } : c));
  }, [categories, save]);

  const toggleCategory = useCallback((id) => {
    save(categories.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  }, [categories, save]);

  const resetCategories = useCallback(() => {
    storage.remove('categories');
    setCategories(seedCategories());
  }, []);

  return { categories, addCategory, updateCategory, toggleCategory, resetCategories };
}
