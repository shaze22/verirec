import { format } from 'date-fns';

export function FlagsPanel({ flags = [], onRemove }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <p className="text-xs font-medium text-gray-500">BENDERA MERAH ({flags.length})</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {flags.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Tiada bendera ditanda</p>
        )}
        {flags.map((flag, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
            <span className="text-red-500 mt-0.5">🚩</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-800">{flag.text}</p>
              <p className="text-xs text-red-400 mt-0.5">{format(new Date(flag.timestamp), 'HH:mm:ss')}</p>
            </div>
            {onRemove && (
              <button onClick={() => onRemove(i)} className="text-red-300 hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
