import { useState } from 'react';
import { format } from 'date-fns';
import AmountInput from './AmountInput';
import CategoryPicker from './CategoryPicker';
import { validateAmount, validateExpenseDate, validateCategory } from '../../lib/validation';
import { toCents, getFrequentCategories } from '../../lib/calculations';
import { PAYMENT_METHODS } from '../../lib/constants';

const TODAY = format(new Date(), 'yyyy-MM-dd');

/**
 * Unified expense form used for Add and Edit.
 * Props:
 *   initialValues: { amount, categoryId, description, paymentMethod, expenseDate }
 *   categories: Category[]
 *   allExpenses: Expense[] (for frequent categories calculation)
 *   onSave: (data) => void
 *   onCancel: () => void
 *   isSaving: bool
 */
export default function ExpenseForm({
  initialValues = {},
  categories,
  allExpenses = [],
  onSave,
  onCancel,
  isSaving = false,
}) {
  const [amount, setAmount] = useState(initialValues.amount || '');
  const [categoryId, setCategoryId] = useState(initialValues.categoryId || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [paymentMethod, setPaymentMethod] = useState(initialValues.paymentMethod || '');
  const [expenseDate, setExpenseDate] = useState(initialValues.expenseDate || TODAY);
  const [showMore, setShowMore] = useState(!!(initialValues.description || initialValues.paymentMethod));
  const [errors, setErrors] = useState({});

  const frequentIds = getFrequentCategories(allExpenses, 4);
  const amountValid = validateAmount(amount).valid;
  const canSave = amountValid && !!categoryId;

  const handleSave = () => {
    const amountResult = validateAmount(amount);
    const dateResult = validateExpenseDate(expenseDate);
    const catResult = validateCategory(categoryId, categories);

    const newErrors = {};
    if (!amountResult.valid) newErrors.amount = amountResult.error;
    if (!dateResult.valid) newErrors.date = dateResult.error;
    if (!catResult.valid) newErrors.category = catResult.error;

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    onSave({
      amountInCents: toCents(amount),
      categoryId,
      description: description.trim(),
      paymentMethod: paymentMethod || null,
      expenseDate,
    });
  };

  return (
    <div className="flex flex-col">
      {/* Amount Hero Section */}
      <section className="py-6 px-5 flex flex-col items-center justify-center">
        <AmountInput value={amount} onChange={setAmount} />
        {errors.amount && (
          <p className="text-rose-600 text-xs font-semibold mt-2">{errors.amount}</p>
        )}

        {/* Date Selector Pill */}
        <div className="mt-5 flex items-center gap-2">
          <label className="px-3.5 py-1.5 bg-white ring-1 ring-black/[0.06] rounded-full flex items-center gap-2 cursor-pointer hover:bg-[#F8FAFC] shadow-2xs transition-all active:scale-95">
            <span className="material-symbols-outlined text-[16px] text-indigo-600">calendar_today</span>
            <input
              type="date"
              value={expenseDate}
              max={TODAY}
              onChange={e => setExpenseDate(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-[#0F1424] focus:outline-none cursor-pointer p-0"
            />
          </label>
        </div>
        {errors.date && (
          <p className="text-rose-600 text-xs font-semibold mt-1">{errors.date}</p>
        )}
      </section>

      {/* Category Section */}
      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Select Category</h2>
          <span className="text-[11px] text-[#94A3B8]">Required</span>
        </div>
        {errors.category && (
          <p className="text-rose-600 text-xs font-semibold mb-2 px-1">{errors.category}</p>
        )}
        <CategoryPicker
          categories={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          frequentIds={frequentIds}
        />
      </section>

      {/* More Options Section */}
      <section className="px-5 mb-8">
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center justify-between w-full p-4 rounded-[20px] bg-white ring-1 ring-black/[0.05] shadow-2xs hover:bg-[#F8FAFC] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-[#64748B]">tune</span>
            <span className="text-xs font-bold text-[#0F1424]">Notes & Payment Method</span>
          </div>
          <span
            className="material-symbols-outlined text-[18px] text-[#64748B] transition-transform duration-200"
            style={{ transform: showMore ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            expand_more
          </span>
        </button>

        {showMore && (
          <div className="mt-3 space-y-3">
            {/* Description */}
            <div className="bg-white rounded-[22px] p-4 ring-1 ring-black/[0.05] shadow-2xs">
              <label className="block text-[11px] font-bold text-[#64748B] mb-2 uppercase tracking-wider">
                Note / Description
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What was this expense for?"
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-[#0F1424] placeholder:text-[#cbd5e1] outline-none"
              />
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-[22px] p-4 ring-1 ring-black/[0.05] shadow-2xs">
              <label className="block text-[11px] font-bold text-[#64748B] mb-2.5 uppercase tracking-wider">
                Payment Method
              </label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(pm => {
                  const isSelected = paymentMethod === pm.value;
                  return (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setPaymentMethod(isSelected ? '' : pm.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-[#0F1424] text-white shadow-xs'
                          : 'bg-[#F8FAFC] text-[#64748B] ring-1 ring-black/[0.05] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{pm.icon}</span>
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 w-full p-5 backdrop-blur-md bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent z-40">
        <div className="max-w-[768px] mx-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="w-full bg-gradient-to-r from-[#0F1424] to-[#1E2746] text-white text-base font-bold py-4 rounded-full shadow-[0_12px_24px_-6px_rgba(15,20,36,0.35)] hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">check</span>
            <span>{isSaving ? 'Saving…' : 'Save Expense'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
