import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Home from './pages/Home';
import AddExpense from './pages/AddExpense';
import History from './pages/History';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import ManageCategories from './pages/ManageCategories';
import BottomNav from './components/layout/BottomNav';
import CheckInModal from './components/ui/CheckInModal';
import { useExpenses } from './hooks/useExpenses';
import { useSettings } from './hooks/useSettings';

// Hide bottom nav on /add and /categories
function AppShell() {
  const location = useLocation();
  const hideNav = location.pathname === '/add' || location.pathname === '/categories';

  return (
    <div className="relative">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddExpense />} />
        <Route path="/history" element={<History />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/categories" element={<ManageCategories />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </div>
  );
}

// Reminder logic lives here — inside BrowserRouter so useNavigate works
function AppWithReminder() {
  const { expenses } = useExpenses();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [showCheckIn, setShowCheckIn] = useState(false);

  useEffect(() => {
    if (!settings.reminderEnabled) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const sessionKey = `spendly_reminder_shown_${today}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const now = new Date();
    const [rHour, rMin] = (settings.reminderTime || '21:00').split(':').map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(rHour, rMin, 0, 0);
    if (now < reminderDate) return;

    const hasExpenseToday = expenses.some(e => e.expenseDate === today);
    if (hasExpenseToday) return;

    sessionStorage.setItem(sessionKey, '1');
    setShowCheckIn(true);
  }, [settings.reminderEnabled, settings.reminderTime, expenses]);

  const handleLogExpense = () => {
    setShowCheckIn(false);
    navigate('/add');
  };

  const handleNothingToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = JSON.parse(sessionStorage.getItem('spendly_no_expense_days') || '[]');
    if (!existing.includes(today)) existing.push(today);
    sessionStorage.setItem('spendly_no_expense_days', JSON.stringify(existing));
    setShowCheckIn(false);
  };

  return (
    <>
      {showCheckIn && (
        <CheckInModal
          onLogExpense={handleLogExpense}
          onNothingToday={handleNothingToday}
        />
      )}
      <AppShell />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppWithReminder />
    </BrowserRouter>
  );
}
