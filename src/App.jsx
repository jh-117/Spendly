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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#dee1ff] text-[#181d3a] flex items-center justify-center mb-4 text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-[#181d3a] mb-2">Something went wrong</h1>
          <p className="text-sm text-[#64748B] max-w-sm mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#181d3a] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all"
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
