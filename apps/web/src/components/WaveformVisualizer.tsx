import React from 'react';

interface WaveBarStyle extends React.CSSProperties {
  '--wave-delay': string;
}

interface WaveformVisualizerProps {
  isActive: boolean;
  level: number; // 0 to 100
  barCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  level,
  barCount = 12,
}) => {
  return (
    <div
      className={`audio-waveform${isActive ? ' is-active' : ''}`}
      role="img"
      aria-label={isActive ? `Live microphone audio level: ${level} percent` : 'Microphone audio level is inactive'}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const factor = 0.35 + Math.sin((i / (barCount - 1)) * Math.PI) * 0.65;
        const dynamicHeight = isActive
          ? Math.max(5, Math.min(34, Math.round(level * factor * 0.34) + 5))
          : 5;

        return (
          <div
            key={i}
            className="audio-waveform-bar"
            style={{ height: `${dynamicHeight}px`, '--wave-delay': `${(i % 12) * -0.07}s` } as WaveBarStyle}
          />
        );
      })}
    </div>
  );
};
