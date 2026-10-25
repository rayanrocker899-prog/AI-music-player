import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { player } from '../audio/player';
import { getArt } from '../utils/art';

/** Compact neumorphic mini-player, mirroring the persistent media notification. */
export function MiniPlayer() {
  const track = useStore((s) => s.currentTrack);
  const isPlaying = useStore((s) => s.isPlaying);
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const [pct, setPct] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    return player.events.on('time', ({ pos, dur }) => {
      const now = performance.now();
      if (now - last.current > 600 && dur) {
        last.current = now;
        setPct(Math.min(100, (pos / dur) * 100));
      }
    });
  }, []);

  const show = !!track && tab !== 'player';

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          onClick={() => setTab('player')}
          className="surface w-full flex items-center gap-3 p-2 pr-3 text-left relative overflow-hidden"
          style={{ borderRadius: 18 }}
        >
          {/* progress line */}
          <div
            className="absolute top-0 left-0 h-[2.5px] transition-[width] duration-700 ease-linear"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              boxShadow: 'var(--glow)',
            }}
          />
          <img src={getArt(track, 128)} alt="" className="w-11 h-11 rounded-xl object-cover" draggable={false} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13.5px] truncate">{track.title}</div>
            <div className="text-dim text-[11px] truncate">{track.artist}</div>
          </div>
          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="btn-neu"
            style={{ width: 38, height: 38 }}
            onClick={(e) => { e.stopPropagation(); player.toggle(); }}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" strokeWidth={0.5} /> : <Play size={16} fill="currentColor" strokeWidth={0.5} className="ml-0.5" />}
          </button>
          <button
            aria-label="Next"
            className="btn-neu"
            style={{ width: 38, height: 38 }}
            onClick={(e) => { e.stopPropagation(); player.next(); }}
          >
            <SkipForward size={16} fill="currentColor" strokeWidth={1} />
          </button>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
