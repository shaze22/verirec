import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { getSessions } from '../api/sessions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { BillingGate } from '../components/billing/BillingGate.jsx';
import toast from 'react-hot-toast';

const professionLabels = {
  counselor: 'Kaunselor', police: 'Polis', sprm: 'SPRM/MACC',
  doctor: 'Doktor', iso: 'Juruaudit ISO', hr: 'HR/Penyiasat',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { canStartSession } = useBillingStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    getSessions(user.id)
      .then(setSessions)
      .catch(() => toast.error('Gagal memuatkan sesi'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleNewSession = () => {
    if (!canStartSession()) {
      toast.error('Had sesi dicapai. Naik taraf pelan anda.');
      navigate('/pricing');
      return;
    }
    navigate('/session/new');
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title="Papan Pemuka"
        actions={
          <BillingGate plan="free" sessionCheck>
            <Button onClick={handleNewSession}>+ Sesi Baru</Button>
          </BillingGate>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎙️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tiada Sesi Lagi</h3>
            <p className="text-gray-500 mb-6">Mulakan sesi pertama anda untuk merakam temuduga profesional</p>
            <Button onClick={handleNewSession}>Mulakan Sesi Pertama</Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">SESI TERKINI ({sessions.length})</h3>
            </div>
            <div className="grid gap-3">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/session/${s.id}`)}
                  className="bg-white rounded-xl border p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-lg flex-shrink-0">
                    🎙️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 truncate">{s.title}</h4>
                      <Badge color="blue" className="flex-shrink-0">
                        {professionLabels[s.profession] || s.profession}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{s.subject_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{format(new Date(s.created_at), 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-400">{Math.round((s.duration || 0) / 60)} minit</p>
                    {s.report && <Badge color="green" className="mt-1">Laporan Siap</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
