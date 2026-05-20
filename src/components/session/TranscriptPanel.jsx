import { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

const TYPE_COLORS = {
  TRANSCRIPT: 'text-gray-800',
  INTERVIEWER: 'text-blue-700',
  NOTE: 'text-amber-700',
  FLAG: 'text-red-700',
  SYSTEM: 'text-gray-400',
};

const TYPE_BG = {
  FLAG: 'bg-red-50 border-l-2 border-red-400',
  NOTE: 'bg-amber-50',
  SYSTEM: 'bg-gray-50',
};

export function TranscriptPanel({ entries = [], onExport }) {
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const filtered = search
    ? entries.filter(e => e.text?.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const handleExport = () => {
    const text = entries
      .map(e => `[${format(new Date(e.timestamp), 'HH:mm:ss')}] ${e.speaker || e.type}: ${e.text}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transkrip-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b">
        <input
          type="text"
          placeholder="Cari dalam transkrip..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={handleExport} className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors" title="Eksport .txt">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            {search ? 'Tiada hasil' : 'Transkrip akan muncul di sini...'}
          </p>
        )}
        {filtered.map(entry => (
          <div key={entry.id} className={clsx('p-2 rounded-lg text-sm', TYPE_BG[entry.type])}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-gray-400">
                {format(new Date(entry.timestamp), 'HH:mm:ss')}
              </span>
              {entry.speaker && (
                <span className="text-xs font-medium text-blue-600">{entry.speaker}</span>
              )}
              {entry.type === 'FLAG' && (
                <span className="text-xs font-medium text-red-600">🚩 Bendera</span>
              )}
            </div>
            <p className={clsx('leading-relaxed', TYPE_COLORS[entry.type] || TYPE_COLORS.TRANSCRIPT)}>
              {entry.text}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
