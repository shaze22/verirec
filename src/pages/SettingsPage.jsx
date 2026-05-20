import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { BillingSettings } from '../components/billing/BillingSettings.jsx';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { fetchSubscription } = useBillingStore();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success('Pembayaran berjaya! Pelan anda telah dikemas kini.');
      if (user) fetchSubscription(user.id);
    } else if (payment === 'cancelled') {
      toast.error('Pembayaran dibatalkan.');
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Tetapan" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profil Akaun</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">E-mel</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nama</span>
                <span className="font-medium">{user?.user_metadata?.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID Pengguna</span>
                <span className="font-mono text-xs text-gray-400">{user?.id?.substring(0, 16)}...</span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Langganan & Penggunaan</h2>
            <BillingSettings />
          </section>
        </div>
      </div>
    </div>
  );
}
