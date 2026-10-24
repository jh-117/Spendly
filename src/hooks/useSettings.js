import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_SETTINGS } from '../lib/constants';

export function useSettings() {
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);

  // Fetch settings from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (!cancelled) {
        if (error) {
          console.error('Failed to load settings:', error);
        } else if (data) {
          setSettingsState({
            ...DEFAULT_SETTINGS,
            currency: data.currency || DEFAULT_SETTINGS.currency,
            reminderEnabled: data.reminder_enabled ?? DEFAULT_SETTINGS.reminderEnabled,
            reminderTime: data.reminder_time || DEFAULT_SETTINGS.reminderTime,
            cycleStartDay: data.cycle_start_day ?? DEFAULT_SETTINGS.cycleStartDay,
            adjustWeekendPayday: data.adjust_weekend_payday ?? DEFAULT_SETTINGS.adjustWeekendPayday,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updateSettings = useCallback(async (changes) => {
    const updated = { ...settings, ...changes };
    const now = new Date().toISOString();

    const dbUpdates = { updated_at: now };
    if (changes.currency !== undefined) dbUpdates.currency = changes.currency;
    if (changes.reminderEnabled !== undefined) dbUpdates.reminder_enabled = changes.reminderEnabled;
    if (changes.reminderTime !== undefined) dbUpdates.reminder_time = changes.reminderTime;
    if (changes.cycleStartDay !== undefined) dbUpdates.cycle_start_day = changes.cycleStartDay;
    if (changes.adjustWeekendPayday !== undefined) dbUpdates.adjust_weekend_payday = changes.adjustWeekendPayday;

    const { error } = await supabase
      .from('settings')
      .update(dbUpdates)
      .eq('id', 1);
    if (error) {
      console.error('Failed to save settings:', error);
      return;
    }
    setSettingsState(updated);
  }, [settings]);

  return { settings, updateSettings };
}
