import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getAuditLogs } from '../api/auditLog.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import toast from 'react-hot-toast';

const actionLabels = {
  'session.view':       { label: 'Sesi Dilihat',       color: 'bg-blue-100 text-blue-700' },
  'report.view':        { label: 'Laporan Dilihat',     color: 'bg-purple-100 text-purple-700' },
  'report.generate':    { label: 'Laporan Dijana',      color: 'bg-green-100 text-green-700' },
  'report.pin.set':     { label: 'PIN Ditetapkan',      color: 'bg-amber-100 text-amber-700' },
  'report.pin.unlock':  { label: 'PIN Dibuka',          color: 'bg-amber-100 text-amber-700' },
  'session.create':     { label: 'Sesi Dicipta',        color: 'bg-green-100 text-green-700' },
  'session.delete':     { label: 'Sesi Dipadam',        color: 'bg-red-100 text-red-700' },
  'subject.create':     { label: 'Profil Dicipta',      color: 'bg-teal-100 text-teal-700' },
  'case.create':        { label: 'Fail Kes Dibuka',     color: 'bg-indigo-100 text-indigo-700' },
  'signature.save':     { label: 'Tandatangan Disimpan',color: 'bg-green-100 text-green-700' },
  'mfa.enroll':         { label: '2FA Diaktifkan',      color: 'bg-green-100 text-green-700' },
  'mfa.unenroll':       { label: '2FA Dinyahaktifkan',  color: 'bg-red-100 text-red-700' },
  'login':              { label: 'Log Masuk',           color: 'bg-gray-100 text-gray-700' },
  'logout':             { label: 'Log Keluar',          color: 'bg-gray-100 text-gray-700' },
};

const ALL = 'semua';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(ALL);

  useEffect(() => {
    getAuditLogs()
      .then(setLogs)
      .catch(() => toast.error('Gagal memuatkan log audit.'))
      .finally(() => setLoading(false));
  }, []);

  const actionTypes = [ALL, ...Object.keys(actionLabels).filter(k => logs.some(l => l.action === k))];
  const filtered = filter === ALL ? logs : logs.filter(l => l.action === filter);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Log Audit" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Log Audit</h2>
              <p className="text-sm text-gray-500 mt-0.5">Rekod semua aktiviti dalam akaun anda</p>
            </div>
            <span className="text-xs text-gray-400">{filtered.length} rekod</span>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {actionTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === ALL ? 'Semua' : (actionLabels[type]?.label || type)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Tiada rekod aktiviti lagi.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(log => {
                const ac = actionLabels[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={log.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${ac.color}`}>
                      {ac.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      {log.resource_name && (
                        <p className="text-sm text-gray-800 truncate">{log.resource_name}</p>
                      )}
                      {log.metadata?.userAgent && (
                        <p className="text-xs text-gray-400 truncate">{log.metadata.userAgent.split(' ')[0]}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0 text-right">
                      {format(new Date(log.created_at), 'dd MMM yy, HH:mm')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
