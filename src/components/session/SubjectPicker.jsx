import { useState, useEffect, useRef } from 'react';
import { searchSubjects, createSubject } from '../../api/subjects.js';

export function SubjectPicker({ value, onChangeName, onChangeId, userId, label, required }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [linked, setLinked] = useState(null);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (linked) return;
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchSubjects(query);
        setResults(data);
        setOpen(data.length > 0);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, linked]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setLinked(null);
    onChangeName(e.target.value);
    onChangeId(null);
  };

  const handleSelect = (subject) => {
    setQuery(subject.name);
    setLinked(subject);
    setOpen(false);
    setResults([]);
    onChangeName(subject.name);
    onChangeId(subject.id);
  };

  const handleUnlink = () => {
    setLinked(null);
    onChangeId(null);
  };

  const handleCreateNew = async () => {
    if (!query.trim()) return;
    setCreating(true);
    try {
      const subject = await createSubject(userId, { name: query.trim() });
      handleSelect(subject);
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  const exactMatch = results.some(r => r.name.toLowerCase() === query.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <span className="flex items-center text-sm font-medium text-gray-700 mb-1">
        {label}{required && ' *'}
      </span>

      <div className={`flex items-center border rounded-lg px-3 py-2 bg-white transition-colors ${linked ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-300 focus-within:border-blue-500'}`}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Nama subjek atau cari profil sedia ada..."
          required={required}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {linked && (
          <button type="button" onClick={handleUnlink} title="Nyahkait profil" className="ml-2 text-blue-400 hover:text-red-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {linked && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-blue-700">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profil dihubungkan
          </span>
          {linked.ic_number && <span className="text-gray-500">IC: {linked.ic_number}</span>}
          {linked.phone && <span className="text-gray-500">{linked.phone}</span>}
        </div>
      )}

      {open && !linked && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="text-sm font-medium text-gray-900">{s.name}</div>
              {(s.ic_number || s.phone) && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {s.ic_number && <span>IC: {s.ic_number}</span>}
                  {s.ic_number && s.phone && <span className="mx-1.5">·</span>}
                  {s.phone && <span>{s.phone}</span>}
                </div>
              )}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={creating}
              className="w-full px-4 py-2.5 text-left hover:bg-green-50 transition-colors text-sm text-green-700 font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {creating ? 'Mencipta profil...' : `Simpan "${query}" sebagai profil baru`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
