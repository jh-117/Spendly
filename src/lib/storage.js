// localStorage adapter — single source of truth for all reads/writes
const PREFIX = 'spendly_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write failed:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  },
};
