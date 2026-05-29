import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { createStripeCheckout } from '../../api/billing.js';
import { useBillingStore } from '../../store/billingStore.js';
import { Button } from '../ui/Button.jsx';
import toast from 'react-hot-toast';

const plans = [
  {
    key: 'free',
    label: 'Percuma',
    price: 0,
    sessions: 2,
    popular: false,
    features: ['2 sesi/bulan', '1 pengguna', 'Transkripsi automatik', 'Laporan asas'],
    notIncluded: ['Analisa AI Realtime', 'Laporan PDF', 'Sokongan keutamaan'],
  },
  {
    key: 'starter',
    label: 'Starter',
    price: 249,
    sessions: 20,
    popular: false,
    features: ['20 sesi/bulan', '2 pengguna', 'Analisa AI Realtime', 'Laporan PDF', 'Eksport laporan'],
    notIncluded: ['Pengguna tidak terhad', 'SLA 99.9%'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 999,
    sessions: 100,
    popular: true,
    features: ['100 sesi/bulan', '10 pengguna', 'Semua ciri Starter', 'Analisa AI 7 Profesion', 'Keutamaan sokongan', 'Akses API'],
    notIncluded: ['200+ sesi/bulan'],
  },
  {
    key: 'biz',
    label: 'Perniagaan',
    price: 2499,
    sessions: 200,
    popular: false,
    features: ['200 sesi/bulan', 'Pengguna tidak terhad', 'Semua ciri Pro', 'Akaun terurus', 'SLA 99.9%', 'Onboarding khusus'],
    notIncluded: [],
  },
];

export function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(null);
  const { subscription } = useBillingStore();
  const navigate = useNavigate();

  const subscribe = async (plan) => {
    if (plan === 'free') return;
    if (plan === 'biz') {
      window.location.href = 'mailto:hello@verirec.my?subject=Pertanyaan Pelan Perniagaan VeriRec';
      return;
    }
    setLoading(plan);
    try {
      const { url } = await createStripeCheckout(plan, annual);
      window.location.href = url;
    } catch (err) {
      const msg = err.message === 'auth_expired'
        ? 'Sila log masuk semula.'
        : err.message === 'Stripe not configured'
        ? 'Sistem pembayaran belum dikonfigurasi.'
        : 'Pembayaran gagal. Cuba lagi.';
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  const getMonthlyPrice = (plan) => {
    if (plan.price === 0) return null;
    return annual ? Math.round(plan.price * 0.83) : plan.price;
  };

  const getAnnualTotal = (plan) => Math.round(plan.price * 10 * 0.83);

  const getCta = (plan) => {
    const isCurrent = subscription?.plan === plan.key;
    if (isCurrent) return 'Pelan Aktif';
    if (plan.key === 'free') return 'Percuma';
    if (plan.key === 'biz') return 'Hubungi Kami';
    return 'Langgan Sekarang';
  };

  return (
    <>
    <Helmet>
      <title>Harga & Pelan — VeriRec</title>
      <meta name="description" content="Pilih pelan VeriRec yang sesuai — dari percuma hingga RM2,499/bulan. Rakaman temu bual profesional dengan AI, transkripsi automatik, dan pematuhan PDPA." />
      <link rel="canonical" href="https://verirec.vercel.app/pricing" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://verirec.vercel.app/pricing" />
      <meta property="og:title" content="Harga & Pelan — VeriRec" />
      <meta property="og:description" content="Mulakan percuma dengan 2 sesi sebulan. Naik taraf untuk mendapatkan lebih banyak sesi dan ciri premium." />
      <meta property="og:image" content="https://verirec.vercel.app/pwa-512.svg" />
    </Helmet>
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Pelan & Harga</h1>
        <p className="text-gray-600 mt-2">Mulakan percuma. Naik taraf apabila anda bersedia.</p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className={`text-sm font-medium ${!annual ? 'text-blue-600' : 'text-gray-500'}`}>Bulanan</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-blue-600' : 'text-gray-500'}`}>
            Tahunan <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full ml-1">Jimat 17%</span>
          </span>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Bayar dengan kad kredit atau debit — auto-renewal setiap bulan/tahun.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map(plan => {
          const isCurrent = subscription?.plan === plan.key;
          const monthlyPrice = getMonthlyPrice(plan);

          return (
            <div key={plan.key} className={`relative rounded-2xl border-2 p-6 flex flex-col ${
              plan.popular ? 'border-blue-600 shadow-xl bg-white' :
              isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            }`}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow">
                  Paling Popular
                </div>
              )}
              {isCurrent && !plan.popular && (
                <div className="text-xs font-semibold text-blue-600 mb-2">PELAN SEMASA</div>
              )}

              <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-4">
                {plan.sessions === -1 ? 'Sesi tidak terhad' : `${plan.sessions} sesi/bulan`}
              </p>

              {/* Price */}
              <div className="mb-5">
                {plan.price === 0 ? (
                  <p className="text-3xl font-bold text-gray-900">Percuma</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">RM{monthlyPrice}</span>
                      <span className="text-gray-500 text-sm">/bulan</span>
                    </div>
                    {annual && (
                      <p className="text-xs text-gray-400 mt-0.5">Dibil RM{getAnnualTotal(plan)}/tahun</p>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
                {plan.notIncluded.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? 'primary' : isCurrent ? 'secondary' : 'outline'}
                className="w-full"
                disabled={isCurrent || plan.key === 'free'}
                loading={loading === plan.key}
                onClick={() => subscribe(plan.key)}
              >
                {getCta(plan)}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Enterprise note */}
      <div className="mt-10 bg-gray-50 rounded-2xl border p-6 text-center">
        <h3 className="font-semibold text-gray-900 mb-2">Memerlukan pelan khusus untuk agensi kerajaan?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Kami menyediakan pakej khas untuk PDRM, SPRM, Kementerian, dan hospital kerajaan.
          Termasuk onboarding, latihan, dan sokongan SLA.
        </p>
        <Button variant="outline" onClick={() => window.location.href = 'mailto:hello@verirec.my?subject=Pertanyaan Pelan Institusi'}>
          Hubungi Jualan
        </Button>
      </div>
    </div>
    </>
  );
}
