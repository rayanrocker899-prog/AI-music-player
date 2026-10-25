import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../store';
import { player } from '../audio/player';
import { getArt } from '../utils/art';
import { Visualizer } from '../components/Visualizer';
import { ProgressBar } from '../components/ProgressBar';
import { RoundBtn } from '../components/primitives';
import { GENRE_COLOR } from '../data/tracks';

export function PlayerScreen() {
  const track = useStore((s) => s.currentTrack);
  const isPlaying = useStore((s) => s.isPlaying);
  const shuffle = useStore((s) => s.shuffle);
  const repeat = useStore((s) => s.repeat);
  const volume = useStore((s) => s.volume);
  const theme = useStore((s) => s.theme);

  if (!track) return null;
  const art = getArt(track);

  return (
    <div className="h-full flex flex-col px-6 pt-3 pb-2 overflow-y-auto no-scrollbar">
      {/* header */}
      <div className="flex items-center justify-center relative mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-faint">Now Playing</span>
      </div>

      {/* stage */}
      <div className="relative flex items-center justify-center my-4" style={{ minHeight: 250 }}>
        <Visualizer className="absolute inset-x-[-24px] inset-y-0 w-[calc(100%+48px)] h-full" />
        <AnimatePresence mode="popLayout">
          <motion.div
            key={track.id}
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, y: theme === 'dark' ? [0, -7, 0] : 0 }}
            exit={{ opacity: 0, scale: 0.92, rotate: 2 }}
            transition={{
              opacity: { duration: 0.35 },
              scale: { duration: 0.35 },
              y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
            }}
            className={theme === 'light' ? 'surface p-3 relative' : 'relative'}
          >
            <img
              src={art}
              alt={`${track.title} album art`}
              className={
                theme === 'light'
                  ? 'w-[210px] h-[210px] rounded-[18px] object-cover'
                  : 'w-[224px] h-[224px] rounded-[26px] object-cover glow-ring ' +
                    (isPlaying ? '' : 'saturate-[0.75] brightness-90')
              }
              style={theme === 'dark' && isPlaying ? { animation: 'orb-breathe 6s ease-in-out infinite' } : undefined}
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* title */}
      <div className="text-center mt-2 mb-4 px-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3"
              style={{
                color: GENRE_COLOR[track.genre] ?? 'var(--accent)',
                background: 'color-mix(in srgb, currentColor 12%, transparent)',
              }}
            >
              {track.genre}
            </div>
            <h1 className="text-[26px] font-bold leading-tight truncate">{track.title}</h1>
            <p className="text-dim text-[15px] mt-1 truncate">
              {track.artist} <span className="text-faint">· {track.album}</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <ProgressBar />

      {/* transport */}
      <div className="flex items-center justify-between mt-3 mb-4 px-1">
        <RoundBtn size={46} active={shuffle} onClick={() => player.setShuffle(!shuffle)} label="Shuffle">
          <Shuffle size={18} strokeWidth={2.2} />
        </RoundBtn>
        <RoundBtn size={58} onClick={() => player.prev()} label="Previous">
          <SkipBack size={23} fill="currentColor" strokeWidth={1} />
        </RoundBtn>
        <RoundBtn accent size={76} onClick={() => player.toggle()} label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <Pause size={30} fill="currentColor" strokeWidth={0.5} />
          ) : (
            <Play size={30} fill="currentColor" strokeWidth={0.5} className="ml-1" />
          )}
        </RoundBtn>
        <RoundBtn size={58} onClick={() => player.next()} label="Next">
          <SkipForward size={23} fill="currentColor" strokeWidth={1} />
        </RoundBtn>
        <RoundBtn size={46} active={repeat !== 'off'} onClick={() => player.cycleRepeat()} label="Repeat">
          {repeat === 'one' ? <Repeat1 size={18} strokeWidth={2.2} /> : <Repeat size={18} strokeWidth={2.2} />}
        </RoundBtn>
      </div>

      {/* volume */}
      <div className="flex items-center gap-3 px-2 pb-2">
        <button
          className="text-dim hover:opacity-70 transition"
          onClick={() => player.setVolume(volume === 0 ? 0.8 : 0)}
          aria-label="Mute"
        >
          {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <input
          aria-label="Volume"
          type="range"
          className="kitty-range flex-1"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          style={{ ['--val' as string]: `${volume * 100}%` }}
          onChange={(e) => player.setVolume(parseFloat(e.target.value))}
        />
        <span className="text-[11px] font-semibold text-faint w-8 text-right">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}
