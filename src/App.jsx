import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import AddExpense from './pages/AddExpense';
import History from './pages/History';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import ManageCategories from './pages/ManageCategories';
import BottomNav from './components/layout/BottomNav';

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

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
