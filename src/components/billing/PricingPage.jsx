import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { createStripeCheckout } from '../../api/billing.js';
import { useBillingStore } from '../../store/billingStore.js';
import { Button } from '../ui/Button.jsx';
import { CONFIG } from '../../config.js';
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

const counselorPlan = {
  key: 'counselor',
  label: 'Kaunselor',
  price: 100,
  sessions: 20,
  features: [
    '20 sesi/bulan',
    'Borang tempahan QR',
    'Fail klien lengkap',
    'Nota Sesi Kes (SOP)',
    'Penilaian MBTI + RIASEC',
    'Laporan AI + PDF',
    'Jadual & Temujanji',
    'Plan Tindakan & Rujukan',
  ],
};

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function PricingPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'kaunselor' ? 'kaunselor' : 'umum');
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(null);
  const { subscription } = useBillingStore();
  const navigate = useNavigate();

  const subscribe = async (plan) => {
    if (plan === 'free') return;
    if (plan === 'biz') {
      window.location.href = 'mailto:hello@verirec.app?subject=Pertanyaan Pelan Perniagaan VeriRec';
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
        : `Ralat: ${err.message}`;
      toast.error(msg, { duration: 8000 });
    } finally {
      setLoading(null);
    }
  };

  const getMonthlyPrice = (price) => annual ? Math.round(price * 0.83) : price;
  const getAnnualTotal = (price) => Math.round(price * 10 * 0.83);

  const isCurrent = (key) => subscription?.plan === key;

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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pelan & Harga</h1>
        <p className="text-gray-600 mt-2">Mulakan percuma. Naik taraf apabila anda bersedia.</p>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
          <button
            onClick={() => setTab('umum')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'umum' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Umum
          </button>
          <button
            onClick={() => setTab('kaunselor')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              tab === 'kaunselor' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Kaunselor
            {isCurrent('counselor') && <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />}
          </button>
        </div>
      </div>

      {tab === 'umum' && (
        <>
          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map(plan => {
              const current = isCurrent(plan.key);
              const monthlyPrice = plan.price === 0 ? null : getMonthlyPrice(plan.price);

              return (
                <div key={plan.key} className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                  plan.popular ? 'border-blue-600 shadow-xl bg-white' :
                  current ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow">
                      Paling Popular
                    </div>
                  )}
                  {current && !plan.popular && (
                    <div className="text-xs font-semibold text-blue-600 mb-2">PELAN SEMASA</div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 mb-4">
                    {plan.sessions === -1 ? 'Sesi tidak terhad' : `${plan.sessions} sesi/bulan`}
                  </p>
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
                          <p className="text-xs text-gray-400 mt-0.5">Dibil RM{getAnnualTotal(plan.price)}/tahun</p>
                        )}
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                    {plan.notIncluded.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                        <XIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? 'primary' : current ? 'secondary' : 'outline'}
                    className="w-full"
                    disabled={current || plan.key === 'free'}
                    loading={loading === plan.key}
                    onClick={() => subscribe(plan.key)}
                  >
                    {current ? 'Pelan Aktif' : plan.key === 'free' ? 'Percuma' : plan.key === 'biz' ? 'Hubungi Kami' : 'Langgan Sekarang'}
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'kaunselor' && (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-600 text-sm">
              Direka khas untuk kaunselor — bayar bulanan, topup bila perlu. Tiada komitmen jangka panjang.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Counselor base plan */}
            <div className={`relative rounded-2xl border-2 p-6 flex flex-col ${
              isCurrent('counselor') ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-600 bg-white shadow-xl'
            }`}>
              {!isCurrent('counselor') && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow">
                  Untuk Kaunselor
                </div>
              )}
              {isCurrent('counselor') && (
                <div className="text-xs font-semibold text-emerald-700 mb-2">PELAN SEMASA</div>
              )}
              <h3 className="text-xl font-bold text-gray-900">Kaunselor Solo</h3>
              <p className="text-sm text-gray-500 mt-0.5 mb-4">20 sesi termasuk setiap bulan</p>

              <div className="mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">RM100</span>
                  <span className="text-gray-500 text-sm">/bulan</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Bersamaan RM5/sesi — batalkan bila-bila masa</p>
              </div>
              <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-emerald-700">🎉 14 hari percubaan percuma</p>
                <p className="text-xs text-emerald-600">Cuba semua ciri tanpa caj. Tanpa kad kredit.</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {counselorPlan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant="primary"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isCurrent('counselor')}
                loading={loading === 'counselor'}
                onClick={() => subscribe('counselor')}
              >
                {isCurrent('counselor') ? 'Pelan Aktif' : 'Langgan Sekarang'}
              </Button>

              {isCurrent('counselor') && (
                <p className="text-xs text-center text-emerald-700 mt-3 font-medium">
                  Baki sesi: {Math.max(0, (subscription?.sessions_limit ?? 10) - (subscription?.sessions_used ?? 0))} sesi bulanan
                  {(subscription?.extra_sessions > 0) && ` + ${subscription.extra_sessions} sesi top-up`}
                </p>
              )}
            </div>

            {/* Top-up packs */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Top-up Sesi Tambahan</h3>
                <p className="text-sm text-gray-500">
                  Beli sesi tambahan bila-bila masa. Tidak luput — dibawa ke bulan berikutnya.
                </p>
              </div>

              {CONFIG.topups.map(topup => (
                <div key={topup.key} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{topup.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">RM{topup.perSession}/sesi</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold text-gray-900">RM{topup.price}</p>
                    <Button
                      variant="outline"
                      className="whitespace-nowrap"
                      disabled={subscription?.plan !== 'counselor'}
                      loading={loading === topup.key}
                      onClick={() => subscribe(topup.key)}
                    >
                      Beli
                    </Button>
                  </div>
                </div>
              ))}

              {subscription?.plan !== 'counselor' && (
                <p className="text-xs text-gray-400 text-center pt-1">
                  Top-up hanya tersedia selepas melanggan Pelan Kaunselor.
                </p>
              )}

              <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 mt-2">
                <p className="text-sm font-semibold text-emerald-800 mb-1">Kos per klien yang jelas</p>
                <p className="text-sm text-emerald-700">
                  Setiap sesi kos RM10–13. Senang kira bila nak charge klien anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise note */}
      <div className="mt-12 bg-gray-50 rounded-2xl border p-6 text-center">
        <h3 className="font-semibold text-gray-900 mb-2">Memerlukan pelan khusus untuk agensi kerajaan?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Kami menyediakan pakej khas untuk PDRM, SPRM, Kementerian, dan hospital kerajaan.
          Termasuk onboarding, latihan, dan sokongan SLA.
        </p>
        <Button variant="outline" onClick={() => window.location.href = 'mailto:hello@verirec.app?subject=Pertanyaan Pelan Institusi'}>
          Hubungi Jualan
        </Button>
      </div>
    </div>
    </>
  );
}
