export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍜', isDefault: true, isActive: true, excludeFromAvg: false },
  { id: 'transport', name: 'Transport', icon: '🚗', isDefault: true, isActive: true, excludeFromAvg: false },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', isDefault: true, isActive: true, excludeFromAvg: false },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮', isDefault: true, isActive: true, excludeFromAvg: false },
  { id: 'education', name: 'Education', icon: '📚', isDefault: true, isActive: true, excludeFromAvg: false },
  { id: 'bills', name: 'Bills', icon: '🏠', isDefault: true, isActive: true, excludeFromAvg: true },
  { id: 'others', name: 'Others', icon: '📦', isDefault: true, isActive: true, excludeFromAvg: false },
];

export const DEFAULT_SETTINGS = {
  currency: 'MYR',
  reminderEnabled: false,
  reminderTime: '21:00',
  cycleStartDay: 25,
  adjustWeekendPayday: true,
};

export const DEFAULT_BUDGET = {
  amountInCents: null,
  updatedAt: new Date().toISOString(),
};

export const CURRENCY_SYMBOL = 'RM';

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'payments' },
  { value: 'debit', label: 'Debit', icon: 'account_balance' },
  { value: 'credit', label: 'Credit', icon: 'credit_card' },
  { value: 'ewallet', label: 'eWallet', icon: 'smartphone' },
];
