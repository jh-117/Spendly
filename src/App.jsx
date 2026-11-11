import React from 'react';
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Spendly ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center antialiased">
          <div className="w-16 h-16 rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-2xs text-[#0F1424] flex items-center justify-center mb-4 text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-[#0F1424] mb-1.5 tracking-tight">Something went wrong</h1>
          <p className="text-xs text-[#64748B] max-w-sm mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#0F1424] hover:bg-[#1E2746] text-white text-xs font-bold px-6 py-3 rounded-full shadow-xs active:scale-95 transition-all"
          >
            Reload Spendly
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
