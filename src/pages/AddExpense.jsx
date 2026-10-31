import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fromCents } from '../lib/calculations';
import { useExpenses } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../hooks/useToast';
import ExpenseForm from '../components/expense/ExpenseForm';
import Toast from '../components/ui/Toast';

export default function AddExpense() {
  const navigate = useNavigate();
  const location = useLocation();
  const { expenses, addExpense, updateExpense } = useExpenses();
  const { categories } = useCategories();
  const { toast, showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Support "Repeat" pre-fill via router state
  const repeatData = location.state?.repeat || null;
  // Support "Edit" mode via router state
  const editData = location.state?.edit || null;

  const initialValues = editData
    ? {
        amount: fromCents(editData.amountInCents),
        categoryId: editData.categoryId,
        description: editData.description,
        paymentMethod: editData.paymentMethod,
        expenseDate: editData.expenseDate,
      }
    : repeatData
    ? {
        amount: fromCents(repeatData.amountInCents),
        categoryId: repeatData.categoryId,
        description: repeatData.description,
        paymentMethod: repeatData.paymentMethod,
        expenseDate: new Date().toISOString().slice(0, 10),
      }
    : {};

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      if (editData) {
        await updateExpense(editData.id, data);
        showToast('Expense updated ✓');
      } else {
        await addExpense(data);
        showToast('Expense saved ✓');
      }
      setTimeout(() => navigate('/'), 500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#0F1424] antialiased">
      {/* Modern Frosted Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F8FAFC]/85 border-b border-black/[0.03]">
        <div className="flex justify-between items-center px-5 py-3.5 max-w-[768px] mx-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white ring-1 ring-black/[0.06] flex items-center justify-center text-[#64748B] hover:text-[#0F1424] hover:shadow-xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <h1 className="text-base font-bold text-[#0F1424] tracking-tight">
            {editData ? 'Edit Expense' : 'Add Expense'}
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-[768px] mx-auto pb-32 pt-2">
        <ExpenseForm
          initialValues={initialValues}
          categories={categories}
          allExpenses={expenses}
          onSave={handleSave}
          onCancel={() => navigate(-1)}
          isSaving={isSaving}
        />
      </main>

      <Toast toast={toast} />
    </div>
  );
}
