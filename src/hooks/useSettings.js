import { useState, useCallback } from 'react';
import { storage } from '../lib/storage';
import { DEFAULT_SETTINGS } from '../lib/constants';

export function useSettings() {
  const [settings, setSettingsState] = useState(() => {
    const saved = storage.get('settings', {});
    return { ...DEFAULT_SETTINGS, ...saved };
  });

  const updateSettings = useCallback((changes) => {
    const updated = { ...settings, ...changes };
    storage.set('settings', updated);
    setSettingsState(updated);
  }, [settings]);

  return { settings, updateSettings };
}
