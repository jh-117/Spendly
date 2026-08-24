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
      {/* Amount */}
      <section className="py-8 flex flex-col items-center justify-center">
        <AmountInput value={amount} onChange={setAmount} />
        {errors.amount && (
          <p className="text-[#ba1a1a] text-body-sm mt-2">{errors.amount}</p>
        )}
        {/* Date picker */}
        <div className="mt-4 flex items-center gap-2">
          <div className="px-4 py-2 bg-[#f3f3f3] rounded-full flex items-center gap-2 cursor-pointer hover:bg-[#eeeeee] transition-colors">
            <span className="material-symbols-outlined text-sm text-[#64748B]">today</span>
            <input
              type="date"
              value={expenseDate}
              max={TODAY}
              onChange={e => setExpenseDate(e.target.value)}
              className="bg-transparent border-none text-body-sm text-[#64748B] focus:outline-none cursor-pointer"
            />
          </div>
        </div>
        {errors.date && (
          <p className="text-[#ba1a1a] text-body-sm mt-1">{errors.date}</p>
        )}
      </section>

      {/* Category */}
      <section className="px-5 mb-6">
        <h2 className="text-label-caps text-[#64748B] mb-4 uppercase tracking-wider">Category</h2>
        {errors.category && (
          <p className="text-[#ba1a1a] text-body-sm mb-2">{errors.category}</p>
        )}
        <CategoryPicker
          categories={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          frequentIds={frequentIds}
        />
      </section>

      {/* More Options */}
      <section className="px-5 mb-6">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 text-[#181d3a] hover:opacity-80 transition-opacity w-full py-2"
        >
          <span
            className="material-symbols-outlined text-lg transition-transform duration-200"
            style={{ transform: showMore ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            expand_more
          </span>
          <span className="text-body-md font-semibold">More options</span>
        </button>

        {showMore && (
          <div className="mt-4 space-y-4">
            {/* Description */}
            <div className="bg-white rounded-2xl p-4 border border-[#e2e2e2]">
              <label className="block text-label-caps text-[#64748B] mb-2 uppercase">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What was this for?"
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-body-md text-[#1a1c1c] placeholder:text-[#dadada] outline-none"
              />
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-4 border border-[#e2e2e2]">
              <label className="block text-label-caps text-[#64748B] mb-3 uppercase">Payment Method</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.value}
                    onClick={() => setPaymentMethod(paymentMethod === pm.value ? '' : pm.value)}
                    className={`px-4 py-2 rounded-lg text-body-sm flex items-center gap-2 transition-colors ${
                      paymentMethod === pm.value
                        ? 'bg-[#dee1ff] text-[#11183d] font-semibold'
                        : 'bg-[#f3f3f3] text-[#46464d] hover:bg-[#eeeeee] border border-[#e2e2e2]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{pm.icon}</span>
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#f9f9f9] via-[#f9f9f9]/90 to-transparent z-40">
        <div className="max-w-[768px] mx-auto">
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="w-full bg-[#181d3a] text-white text-headline-lg-mobile py-4 rounded-full shadow-lg shadow-[#181d3a]/20 hover:opacity-90 active:scale-95 transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">check</span>
            {isSaving ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
