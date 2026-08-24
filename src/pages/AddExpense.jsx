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

  const handleSave = (data) => {
    setIsSaving(true);
    try {
      if (editData) {
        updateExpense(editData.id, data);
        showToast('Expense updated ✓');
      } else {
        addExpense(data);
        showToast('Expense saved ✓');
      }
      setTimeout(() => navigate('/'), 500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen text-[#1a1c1c] antialiased">
      {/* Header */}
      <header className="w-full bg-[#f9f9f9] flex justify-between items-center px-5 py-4 max-w-[768px] mx-auto relative z-40">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-[#f3f3f3] flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-[#1a1c1c] text-xl">close</span>
        </button>
        <h1 className="text-headline-lg-mobile font-bold text-[#181d3a]">
          {editData ? 'Edit Expense' : 'Add Expense'}
        </h1>
        <div className="w-10" />
      </header>

      <main className="max-w-[768px] mx-auto pb-32">
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
