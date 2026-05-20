export function Waveform({ level, isRecording, isPaused }) {
  const bars = 20;

  return (
    <div className="flex items-end gap-0.5 h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = isRecording && !isPaused;
        const randomFactor = isActive ? (Math.sin(Date.now() / 200 + i) + 1) / 2 : 0;
        const height = isActive ? Math.max(4, (level / 100) * 48 * randomFactor + 4) : 4;
        return (
          <div
            key={i}
            className="w-1 rounded-full transition-all duration-75"
            style={{
              height: `${height}px`,
              backgroundColor: isActive ? `hsl(${220 + (level / 100) * 20}, 80%, 55%)` : '#d1d5db',
            }}
          />
        );
      })}
    </div>
  );
}
