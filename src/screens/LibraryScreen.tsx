import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderSearch, Mic, Music2, RefreshCw, Search } from 'lucide-react';
import { useStore } from '../store';
import { player } from '../audio/player';
import { getArt } from '../utils/art';
import { formatTime, normalize } from '../utils/misc';
import { scanFiles } from '../utils/scan';
import type { Track } from '../data/tracks';

type Filter = 'all' | 'top' | 'local';

function TrackCard({ track, index }: { track: Track; index: number }) {
  const current = useStore((s) => s.currentTrack?.id === track.id);
  const isPlaying = useStore((s) => s.isPlaying);
  const count = useStore((s) => s.playCounts[track.id] ?? 0);

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.4), duration: 0.3 }}
      onClick={() => player.playTrack(track)}
      className={`surface w-full flex items-center gap-3 p-3 text-left transition-transform active:scale-[0.98] ${
        current ? 'glow-ring' : ''
      }`}
    >
      <div className="relative shrink-0">
        <img src={getArt(track, 128)} alt="" className="w-[52px] h-[52px] rounded-xl object-cover" draggable={false} />
        {current && isPlaying && (
          <div className="absolute inset-0 rounded-xl bg-black/45 flex items-end justify-center gap-[3px] pb-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="eq-bar h-3" style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] truncate" style={current ? { color: 'var(--accent)' } : undefined}>
          {track.title}
        </div>
        <div className="text-dim text-xs truncate mt-0.5">
          {track.artist} · {track.genre}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] font-semibold text-faint">{formatTime(track.duration)}</span>
        {count > 0 && <span className="text-[9px] font-bold text-faint uppercase tracking-wider">{count}×</span>}
      </div>
    </motion.button>
  );
}

export function LibraryScreen() {
  const library = useStore((s) => s.library);
  const playCounts = useStore((s) => s.playCounts);
  const musicFolder = useStore((s) => s.settings.musicFolder);
  const addLocalTracks = useStore((s) => s.addLocalTracks);
  const patchSettings = useStore((s) => s.patchSettings);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const dirRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<{ start: () => void } | null>(null);

  const tracks = useMemo(() => {
    let list = library;
    if (filter === 'local') list = list.filter((t) => t.source === 'local');
    if (filter === 'top') {
      list = [...list].sort((a, b) => (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0));
      list = list.filter((t) => (playCounts[t.id] ?? 0) > 0);
    }
    const q = normalize(query);
    if (q) {
      list = list.filter(
        (t) =>
          normalize(t.title).includes(q) ||
          normalize(t.artist).includes(q) ||
          normalize(t.album).includes(q)
      );
    }
    return list;
  }, [library, query, filter, playCounts]);

  const onScan = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setScanning(true);
    setScanMsg('Scanning audio files…');
    const found = await scanFiles(files);
    addLocalTracks(found);
    patchSettings({ musicFolder: `${files[0] && (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] ? '/' + ((files[0] as File & { webkitRelativePath?: string }).webkitRelativePath!.split('/')[0]) : '/Music'} (${found.length} files)` });
    setScanMsg(found.length ? `Added ${found.length} local track${found.length > 1 ? 's' : ''}.` : 'No audio files found in that folder.');
    setScanning(false);
    if (found.length) setFilter('local');
    setTimeout(() => setScanMsg(''), 3500);
  };

  const voiceSearch = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = 'en-US';
    r.interimResults = false;
    r.onresult = (e) => setQuery(e.results[0][0].transcript);
    r.start();
    voiceRef.current = r;
  };

  return (
    <div className="h-full flex flex-col px-5 pt-3">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-[22px] font-bold leading-none">Library</h1>
          <p className="text-faint text-[11px] mt-1.5 font-medium truncate max-w-[220px]">{musicFolder}</p>
        </div>
        <button
          onClick={() => dirRef.current?.click()}
          className="btn-neu px-4 h-[42px] rounded-2xl gap-2 text-[13px] font-semibold"
          style={{ borderRadius: 16 }}
        >
          <FolderSearch size={16} style={{ color: 'var(--accent)' }} />
          Scan
        </button>
        <input
          ref={dirRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.flac,.m4a,.wav,.ogg,.aac"
          className="hidden"
          onChange={(e) => onScan(e.target.files)}
          {...({ webkitdirectory: '' } as object)}
        />
      </div>

      {/* search */}
      <div className="inset-field flex items-center gap-2.5 px-4 h-[50px] mb-4">
        <Search size={17} className="text-faint shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists…"
          className="bg-transparent outline-none flex-1 text-[14px] font-medium placeholder:text-faint min-w-0"
          style={{ color: 'var(--text)' }}
        />
        <button onClick={voiceSearch} aria-label="Voice search" className="text-faint hover:opacity-70 shrink-0">
          <Mic size={17} style={{ color: 'var(--accent)' }} />
        </button>
      </div>

      {/* filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {([['all', 'All songs'], ['top', 'Most played'], ['local', 'On device']] as [Filter, string][]).map(([f, label]) => (
          <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
        <div className="chip flex items-center gap-1.5 shrink-0" style={{ cursor: 'default' }}>
          <Music2 size={13} />
          {library.length}
        </div>
      </div>

      {scanMsg && (
        <div className="surface px-4 py-2.5 mb-3 flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
          <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
          {scanMsg}
        </div>
      )}

      {/* list */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-40 space-y-3">
        {tracks.map((t, i) => (
          <TrackCard key={t.id} track={t} index={i} />
        ))}
        {!tracks.length && (
          <div className="text-center pt-16 text-faint">
            <Music2 size={36} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">
              {filter === 'top' ? 'Play some songs and Kitty learns your favorites.' : 'No songs found.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
