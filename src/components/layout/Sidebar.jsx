import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore.js';
import { useBillingStore } from '../../store/billingStore.js';

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Papan Pemuka' },
  { to: '/session/new', icon: '🎙️', label: 'Sesi Baru' },
  { to: '/settings', icon: '⚙️', label: 'Tetapan' },
  { to: '/pricing', icon: '💳', label: 'Pelan & Harga' },
];

export function Sidebar() {
  const { user, signOut } = useAuthStore();
  const { subscription } = useBillingStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">VeriRec</h1>
        <p className="text-xs text-gray-400 mt-1">Platform Rakaman Profesional</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        {subscription && (
          <div className="mb-3 px-3 py-2 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400">Pelan semasa</p>
            <p className="text-sm font-medium capitalize">{subscription.plan}</p>
            <p className="text-xs text-gray-400">
              {subscription.sessions_used} / {subscription.sessions_limit === -1 ? '∞' : subscription.sessions_limit} sesi
            </p>
          </div>
        )}
        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors mt-1"
          >
            Log Keluar
          </button>
        </div>
      </div>
    </aside>
  );
}
