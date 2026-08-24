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
    <nav className="glass-nav fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-2 border-t border-[#e2e2e2] shadow-sm">
      {/* Home */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-colors ${
            isActive ? 'text-[#181d3a] font-bold' : 'text-[#64748B] hover:bg-[#f3f3f3]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'icon-fill' : ''}`}>home</span>
            <span className="text-label-caps mt-1">Home</span>
          </>
        )}
      </NavLink>

      {/* History */}
      <NavLink
        to="/history"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-colors ${
            isActive ? 'text-[#181d3a] font-bold' : 'text-[#64748B] hover:bg-[#f3f3f3]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'icon-fill' : ''}`}>history</span>
            <span className="text-label-caps mt-1">History</span>
          </>
        )}
      </NavLink>

      {/* FAB Center */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <button
          onClick={() => navigate('/add')}
          className="fab-shadow absolute -top-6 w-14 h-14 bg-[#181d3a] text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Add expense"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </div>

      {/* Insights */}
      <NavLink
        to="/insights"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-colors ${
            isActive ? 'text-[#181d3a] font-bold' : 'text-[#64748B] hover:bg-[#f3f3f3]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'icon-fill' : ''}`}>insights</span>
            <span className="text-label-caps mt-1">Insights</span>
          </>
        )}
      </NavLink>

      {/* Settings */}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-colors ${
            isActive ? 'text-[#181d3a] font-bold' : 'text-[#64748B] hover:bg-[#f3f3f3]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'icon-fill' : ''}`}>settings</span>
            <span className="text-label-caps mt-1">Settings</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
