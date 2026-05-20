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
        placeholder="Tambah nota atau bendera..."
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => submit('note')}
        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        title="Tambah nota"
      >
        📝
      </button>
      <button
        onClick={() => submit('flag')}
        className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
        title="Tandakan sebagai bendera merah"
      >
        🚩
      </button>
    </div>
  );
}
