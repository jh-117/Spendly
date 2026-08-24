import { format } from 'date-fns';

/** Validate amount string → { valid, error? } */
export function validateAmount(value) {
  if (!value || value.trim() === '' || value === '0.00' || value === '0') {
    return { valid: false, error: 'Amount is required' };
  }
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return { valid: false, error: 'Max 2 decimal places' };
  }
  return { valid: true };
}

/** Validate expense date → { valid, error? } */
export function validateExpenseDate(value) {
  if (!value) return { valid: false, error: 'Date is required' };
  const today = format(new Date(), 'yyyy-MM-dd');
  if (value > today) {
    return { valid: false, error: 'Date cannot be in the future' };
  }
  return { valid: true };
}

/** Validate a category selection → { valid, error? } */
export function validateCategory(categoryId, categories) {
  if (!categoryId) return { valid: false, error: 'Please select a category' };
  const cat = categories.find(c => c.id === categoryId);
  if (!cat || !cat.isActive) return { valid: false, error: 'Invalid category' };
  return { valid: true };
}

/** Validate budget amount → { valid, error? } */
export function validateBudget(value) {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Budget amount is required' };
  }
  const num = parseFloat(value.replace(/,/g, ''));
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: 'Budget must be greater than 0' };
  }
  return { valid: true };
}
