import { useState } from 'react';
import { CONFIG } from '../../config.js';
import { createStripeCheckout, createBillplzBill } from '../../api/billing.js';
import { useBillingStore } from '../../store/billingStore.js';
import { Button } from '../ui/Button.jsx';
import toast from 'react-hot-toast';

const plans = [
  { key: 'free',    label: 'Percuma',   price: 0,   sessions: 3,   users: 1,  features: ['3 sesi/bulan', '1 pengguna', 'Transkrip asas'] },
  { key: 'starter', label: 'Starter',   price: 149, sessions: 20,  users: 2,  features: ['20 sesi/bulan', '2 pengguna', 'Cadangan AI', 'Laporan PDF'] },
  { key: 'pro',     label: 'Pro',       price: 399, sessions: 100, users: 10, features: ['100 sesi/bulan', '10 pengguna', 'Semua ciri Starter', 'Keutamaan sokongan'] },
  { key: 'biz',     label: 'Business',  price: 899, sessions: -1,  users: -1, features: ['Sesi tidak terhad', 'Pengguna tidak terhad', 'Akaun terurus', 'SLA 99.9%'] },
];

export function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(null);
  const [gateway, setGateway] = useState('stripe');
  const { subscription } = useBillingStore();

  const subscribe = async (plan) => {
    if (plan === 'free') return;
    setLoading(plan);
    try {
      let url;
      if (gateway === 'stripe') {
        const res = await createStripeCheckout(plan, annual);
        url = res.url;
      } else {
        const res = await createBillplzBill(plan, annual);
        url = res.url;
      }
      window.location.href = url;
    } catch (err) {
      toast.error('Pembayaran gagal. Cuba lagi.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Pelan & Harga</h1>
        <p className="text-gray-600 mt-2">Pilih pelan yang sesuai dengan keperluan anda</p>

        <div className="flex items-center justify-center gap-4 mt-6">
          <span className={`text-sm ${!annual ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>Bulanan</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-sm ${annual ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
            Tahunan <span className="text-green-600 font-medium">(jimat 17%)</span>
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="text-sm text-gray-500">Bayaran melalui:</span>
          {['stripe', 'billplz'].map(g => (
            <button
              key={g}
              onClick={() => setGateway(g)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${gateway === g ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {g === 'stripe' ? 'Kad Kredit (Stripe)' : 'FPX / Billplz'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {plans.map(plan => {
          const isCurrent = subscription?.plan === plan.key;
          const price = annual && plan.price > 0 ? Math.round(plan.price * 10 * 0.83) : plan.price;
          return (
            <div key={plan.key} className={`rounded-xl border-2 p-6 ${isCurrent ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              {isCurrent && <div className="text-xs font-medium text-blue-600 mb-2">PELAN SEMASA</div>}
              <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
              <div className="mt-2 mb-4">
                {plan.price === 0 ? (
                  <span className="text-3xl font-bold text-gray-900">Percuma</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-gray-900">RM{annual ? price : plan.price}</span>
                    <span className="text-gray-500 text-sm">/{annual ? 'tahun' : 'bulan'}</span>
                  </>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? 'secondary' : 'primary'}
                className="w-full"
                disabled={isCurrent || plan.key === 'free'}
                loading={loading === plan.key}
                onClick={() => subscribe(plan.key)}
              >
                {isCurrent ? 'Pelan Aktif' : plan.price === 0 ? 'Percuma' : 'Langgan Sekarang'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
