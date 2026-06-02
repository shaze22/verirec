import { useState } from 'react';

export function NoteBar({ onNote, onFlag }) {
  const [text, setText] = useState('');

  const submit = (type) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (type === 'note') onNote?.(trimmed);
    if (type === 'flag') onFlag?.(trimmed);
    setText('');
  };

  return (
    <div className="flex gap-2 p-3 border-t bg-white">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit('note'); }}
        placeholder="Add a note or flag during session..."
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Add note or flag"
      />
      <button
        onClick={() => submit('note')}
        disabled={!text.trim()}
        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
        title="Add note (Enter)"
        aria-label="Add note"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="hidden sm:inline">Note</span>
      </button>
      <button
        onClick={() => submit('flag')}
        disabled={!text.trim()}
        className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-600 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
        title="Flag as red flag"
        aria-label="Flag as red flag"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <span className="hidden sm:inline">Flag</span>
      </button>
    </div>
  );
}
