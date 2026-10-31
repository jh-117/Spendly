import { NavLink, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/insights', label: 'Insights', icon: 'insights' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-2 backdrop-blur-xl bg-white/85 border-t border-black/[0.04] shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      {/* Home */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
            isActive ? 'text-[#0F1424] font-bold' : 'text-[#64748B] hover:text-[#0F1424]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] transition-transform ${isActive ? 'icon-fill scale-110' : ''}`}>home</span>
            <span className="text-[11px] font-semibold mt-1">Home</span>
          </>
        )}
      </NavLink>

      {/* History */}
      <NavLink
        to="/history"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
            isActive ? 'text-[#0F1424] font-bold' : 'text-[#64748B] hover:text-[#0F1424]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] transition-transform ${isActive ? 'icon-fill scale-110' : ''}`}>history</span>
            <span className="text-[11px] font-semibold mt-1">History</span>
          </>
        )}
      </NavLink>

      {/* FAB Center */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <button
          onClick={() => navigate('/add')}
          className="absolute -top-5 w-13 h-13 bg-gradient-to-tr from-[#0F1424] to-[#1E2746] text-white rounded-full flex items-center justify-center ring-4 ring-[#F8FAFC] shadow-[0_10px_25px_-5px_rgba(15,20,36,0.4)] hover:scale-105 active:scale-95 transition-all"
          aria-label="Add expense"
        >
          <span className="material-symbols-outlined text-[26px]">add</span>
        </button>
      </div>

      {/* Insights */}
      <NavLink
        to="/insights"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
            isActive ? 'text-[#0F1424] font-bold' : 'text-[#64748B] hover:text-[#0F1424]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] transition-transform ${isActive ? 'icon-fill scale-110' : ''}`}>insights</span>
            <span className="text-[11px] font-semibold mt-1">Insights</span>
          </>
        )}
      </NavLink>

      {/* Settings */}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
            isActive ? 'text-[#0F1424] font-bold' : 'text-[#64748B] hover:text-[#0F1424]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] transition-transform ${isActive ? 'icon-fill scale-110' : ''}`}>settings</span>
            <span className="text-[11px] font-semibold mt-1">Settings</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
