import { useEffect, useRef, useState } from 'react';
import { player } from '../audio/player';
import { useStore } from '../store';
import { formatTime } from '../utils/misc';

export function ProgressBar() {
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const last = useRef(0);
  const trackId = useStore((s) => s.currentTrack?.id);

  useEffect(() => {
    setPos(0);
    setDur(player.getDuration() || useStore.getState().currentTrack?.duration || 0);
  }, [trackId]);

  useEffect(() => {
    return player.events.on('time', ({ pos, dur }) => {
      const now = performance.now();
      if (now - last.current > 140) {
        last.current = now;
        setPos(pos);
        if (dur) setDur(dur);
      }
    });
  }, []);

  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;

  return (
    <div className="w-full px-1">
      <input
        aria-label="Seek"
        type="range"
        className="kitty-range glow-track"
        min={0}
        max={Math.max(1, dur)}
        step={0.1}
        value={pos}
        style={{ ['--val' as string]: `${pct}%` }}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setPos(v);
          player.seekTo(v);
        }}
      />
      <div className="flex justify-between text-[11px] font-semibold text-faint -mt-1">
        <span>{formatTime(pos)}</span>
        <span>{formatTime(dur)}</span>
      </div>
    </div>
  );
}
