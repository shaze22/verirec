import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { useAuthStore } from '../store/authStore.js';
import { useBillingStore } from '../store/billingStore.js';
import { supabase } from '../lib/supabase.js';
import { getAudioLibrary, getSignedUrl, assignAudio, updateAudioTitle, deleteAudio, getStorageUsage, formatBytes, STORAGE_LIMITS } from '../api/audioLibrary.js';
import { professionLabel } from '../data/professions.js';
import { TopBar } from '../components/layout/TopBar.jsx';
import { Button } from '../components/ui/Button.jsx';
import toast from 'react-hot-toast';

function fmtDur(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
function fmtSize(b) {
  if (!b) return '—';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AudioLibraryPage() {
  const { user } = useAuthStore();
  const { subscription } = useBillingStore();
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urlCache, setUrlCache] = useState({});
  const [loadingUrl, setLoadingUrl] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignSessionId, setAssignSessionId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filterAge, setFilterAge] = useState('all'); // 'all' | '3' | '6' | '12'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'largest'
  const [storageUsed, setStorageUsed] = useState(null);
  const editRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getAudioLibrary(user.id)
      .then(data => { setRecordings(data); })
      .catch(() => toast.error('Failed to load recordings'))
      .finally(() => setLoading(false));
    getStorageUsage(user.id).then(setStorageUsed).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const handlePlay = async (rec) => {
    if (urlCache[rec.id]) return;
    setLoadingUrl(prev => new Set(prev).add(rec.id));
    try {
      const url = await getSignedUrl(rec.storage_path);
      setUrlCache(prev => ({ ...prev, [rec.id]: url }));
    } catch {
      toast.error('Failed to load audio');
    } finally {
      setLoadingUrl(prev => { const n = new Set(prev); n.delete(rec.id); return n; });
    }
  };

  const handleSaveTitle = async (id) => {
    if (!editTitle.trim()) return;
    try {
      const updated = await updateAudioTitle(id, editTitle.trim());
      setRecordings(prev => prev.map(r => r.id === id ? { ...r, title: updated.title } : r));
      setEditingId(null);
    } catch {
      toast.error('Failed to update title');
    }
  };

  const handleDelete = async (rec) => {
    if (!window.confirm(`Delete "${rec.title || rec.file_name}"? This action cannot be undone.`)) return;
    try {
      await deleteAudio(rec.id, rec.storage_path);
      setRecordings(prev => prev.filter(r => r.id !== rec.id));
      toast.success('Recording deleted');
    } catch {
      toast.error('Failed to delete recording');
    }
  };

  const handleDownload = (rec) => {
    if (!urlCache[rec.id]) { toast('Play the recording first to download'); return; }
    const a = document.createElement('a');
    a.href = urlCache[rec.id];
    a.download = rec.file_name;
    a.click();
  };

  const openAssign = async (rec) => {
    setAssignModal(rec);
    setAssignSessionId(rec.session_id || '');
    setAssignSubjectId(rec.subject_id || '');
    if (!sessions.length) {
      const { data } = await supabase.from('sessions').select('id, title, profession').eq('user_id', user.id).order('created_at', { ascending: false });
      setSessions(data || []);
    }
    if (!subjects.length) {
      const { data } = await supabase.from('subjects').select('id, name').eq('user_id', user.id).order('name');
      setSubjects(data || []);
    }
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await assignAudio(assignModal.id, {
        sessionId: assignSessionId || null,
        subjectId: assignSubjectId || null,
      });
      const updated = await getAudioLibrary(user.id);
      setRecordings(updated);
      setAssignModal(null);
      toast.success('Recording assigned successfully');
    } catch {
      toast.error('Failed to assign recording');
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    const toDelete = recordings.filter(r => selected.has(r.id));
    const totalSz = toDelete.reduce((a, r) => a + (r.file_size || 0), 0);
    if (!window.confirm(`Delete ${toDelete.length} recordings (${formatBytes(totalSz)})? This action cannot be undone.`)) return;
    setBulkDeleting(true);
    let done = 0;
    for (const rec of toDelete) {
      try {
        await deleteAudio(rec.id, rec.storage_path);
        done++;
      } catch { /* skip failed */ }
    }
    setRecordings(prev => prev.filter(r => !selected.has(r.id)));
    setSelected(new Set());
    setSelectMode(false);
    getStorageUsage(user.id).then(setStorageUsed).catch(() => {});
    toast.success(`${done} recordings deleted.`);
    setBulkDeleting(false);
  };

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // Filter & sort
  const filtered = recordings
    .filter(r => {
      if (filterAge === 'all') return true;
      const cutoff = subMonths(new Date(), Number(filterAge));
      return new Date(r.created_at) < cutoff;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'largest') return (b.file_size || 0) - (a.file_size || 0);
      return new Date(b.created_at) - new Date(a.created_at); // newest
    });

  const selectedSize = recordings.filter(r => selected.has(r.id)).reduce((a, r) => a + (r.file_size || 0), 0);

  const totalDur = recordings.reduce((a, r) => a + (r.duration || 0), 0);
  const totalSize = recordings.reduce((a, r) => a + (r.file_size || 0), 0);

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Audio Library" />

      <div className="flex-1 overflow-auto p-4 pb-20 md:pb-6">
        {!loading && recordings.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total Recordings', value: recordings.length },
                { label: 'Total Duration', value: fmtDur(totalDur) },
                { label: 'Total Size', value: fmtSize(totalSize) },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border p-4">
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Storage usage bar */}
            {storageUsed !== null && (() => {
              const plan = subscription?.plan || 'free';
              const limit = STORAGE_LIMITS[plan] ?? STORAGE_LIMITS.free;
              const pct = Math.min(100, (storageUsed / limit) * 100);
              const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-violet-500';
              return (
                <div className="bg-white rounded-xl border p-4 mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Storage Used</span>
                    <span className="text-gray-500">{formatBytes(storageUsed)} / {formatBytes(limit)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  {pct > 80 && (
                    <p className="text-xs text-amber-600 mt-1.5">⚠️ {pct.toFixed(0)}% full — delete old recordings to free up space.</p>
                  )}
                </div>
              );
            })()}

            {/* Toolbar: filter + sort + select mode */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select
                value={filterAge}
                onChange={e => { setFilterAge(e.target.value); setSelected(new Set()); }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Dates</option>
                <option value="3">Older than 3 Months</option>
                <option value="6">Older than 6 Months</option>
                <option value="12">Older than 1 Year</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="largest">Largest First</option>
              </select>
              <span className="text-xs text-gray-400">{filtered.length} recordings</span>
              <div className="ml-auto flex items-center gap-2">
                {selectMode ? (
                  <>
                    <button
                      onClick={() => {
                        if (selected.size === filtered.length) setSelected(new Set());
                        else setSelected(new Set(filtered.map(r => r.id)));
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selected.size > 0 && (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={bulkDeleting}
                        onClick={handleBulkDelete}
                      >
                        🗑 Delete {selected.size} ({formatBytes(selectedSize)})
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setSelectMode(true)}>
                    Pilih & Delete
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recordings Yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Session audio will be saved here automatically after each session is recorded.</p>
            <Button onClick={() => navigate('/dashboard')}>Start Session</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No recordings in this date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(rec => (
              <div
                key={rec.id}
                className={`bg-white rounded-xl border p-4 transition-colors ${selectMode && selected.has(rec.id) ? 'border-blue-400 bg-blue-50' : ''}`}
                onClick={selectMode ? () => toggleSelect(rec.id) : undefined}
                style={selectMode ? { cursor: 'pointer' } : undefined}
              >
                <div className="flex items-start gap-3">
                  {selectMode ? (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${selected.has(rec.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                      {selected.has(rec.id) && (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {editingId === rec.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          ref={editRef}
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(rec.id); if (e.key === 'Escape') setEditingId(null); }}
                          className="flex-1 text-sm font-medium border border-blue-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => handleSaveTitle(rec.id)} className="text-xs text-blue-600 font-medium hover:text-blue-800">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1 group">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {rec.title || rec.file_name}
                        </h4>
                        <button
                          onClick={() => { setEditingId(rec.id); setEditTitle(rec.title || rec.file_name); }}
                          className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span>{format(new Date(rec.created_at), 'dd MMM yyyy, HH:mm')}</span>
                      {rec.duration > 0 && <span>{fmtDur(rec.duration)}</span>}
                      <span>{fmtSize(rec.file_size)}</span>
                      {rec.session ? (
                        <button
                          onClick={() => navigate(`/session/${rec.session.id}`)}
                          className="text-blue-500 hover:text-blue-700 font-medium"
                        >
                          {rec.session.title} · {professionLabel(rec.session.profession)}
                        </button>
                      ) : rec.subject ? (
                        <span className="text-teal-600 font-medium">{rec.subject.name}</span>
                      ) : (
                        <span className="text-gray-300 italic">Not assigned</span>
                      )}
                    </div>

                    {urlCache[rec.id] ? (
                      <audio
                        src={urlCache[rec.id]}
                        controls
                        className="mt-3 w-full h-8"
                        style={{ height: '32px' }}
                      />
                    ) : (
                      <button
                        onClick={() => handlePlay(rec)}
                        disabled={loadingUrl.has(rec.id)}
                        className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        {loadingUrl.has(rec.id) ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                        {loadingUrl.has(rec.id) ? 'Loading...' : 'Play'}
                      </button>
                    )}
                  </div>

                  {!selectMode && <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openAssign(rec)}
                      title="Assign to session / subject"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDownload(rec)}
                      title="Download"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(rec)}
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Assign Recording</h2>
            <p className="text-xs text-gray-500 mb-4 truncate">{assignModal.title || assignModal.file_name}</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                <select
                  value={assignSessionId}
                  onChange={e => setAssignSessionId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— None —</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({professionLabel(s.profession)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={assignSubjectId}
                  onChange={e => setAssignSubjectId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— None —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setAssignModal(null)} disabled={assigning}>Cancel</Button>
              <Button className="flex-1" onClick={handleAssign} loading={assigning}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
