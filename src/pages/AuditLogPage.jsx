import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getAuditLogs } from '../api/auditLog.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import toast from 'react-hot-toast';

const actionLabels = {
  'session.view':       { label: 'Session Viewed',       color: 'bg-blue-100 text-blue-700' },
  'report.view':        { label: 'Report Viewed',         color: 'bg-purple-100 text-purple-700' },
  'report.generate':    { label: 'Report Generated',      color: 'bg-green-100 text-green-700' },
  'report.pin.set':     { label: 'PIN Set',               color: 'bg-amber-100 text-amber-700' },
  'report.pin.unlock':  { label: 'PIN Unlocked',          color: 'bg-amber-100 text-amber-700' },
  'session.create':     { label: 'Session Created',       color: 'bg-green-100 text-green-700' },
  'session.delete':     { label: 'Session Deleted',       color: 'bg-red-100 text-red-700' },
  'subject.create':     { label: 'Profile Created',       color: 'bg-teal-100 text-teal-700' },
  'case.create':        { label: 'Case File Opened',      color: 'bg-indigo-100 text-indigo-700' },
  'signature.save':     { label: 'Signature Saved',       color: 'bg-green-100 text-green-700' },
  'mfa.enroll':         { label: '2FA Enabled',           color: 'bg-green-100 text-green-700' },
  'mfa.unenroll':       { label: '2FA Disabled',          color: 'bg-red-100 text-red-700' },
  'login':              { label: 'Logged In',             color: 'bg-gray-100 text-gray-700' },
  'logout':             { label: 'Logged Out',            color: 'bg-gray-100 text-gray-700' },
};

const ALL = 'all';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(ALL);

  useEffect(() => {
    getAuditLogs()
      .then(setLogs)
      .catch(() => toast.error('Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, []);

  const actionTypes = [ALL, ...Object.keys(actionLabels).filter(k => logs.some(l => l.action === k))];
  const filtered = filter === ALL ? logs : logs.filter(l => l.action === filter);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Audit Log" />
      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
              <p className="text-sm text-gray-500 mt-0.5">Record of all activity in your account</p>
            </div>
            <span className="text-xs text-gray-400">{filtered.length} records</span>
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {actionTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === ALL ? 'All' : (actionLabels[type]?.label || type)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No activity recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(log => {
                const meta = actionLabels[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={log.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 ${meta.color}`}>
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                    </span>
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
