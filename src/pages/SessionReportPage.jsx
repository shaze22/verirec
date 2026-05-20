import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionById } from '../api/sessions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { ReportView } from '../components/report/ReportView.jsx';
import { Button } from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

export default function SessionReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessionById(id)
      .then(setSession)
      .catch(() => toast.error('Sesi tidak dijumpai'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title="Laporan Sesi"
        actions={<Button variant="secondary" onClick={() => navigate('/dashboard')}>← Kembali</Button>}
      />
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : session ? (
          <ReportView session={session} />
        ) : (
          <p className="text-center text-gray-500 py-20">Laporan tidak dijumpai</p>
        )}
      </div>
    </div>
  );
}
