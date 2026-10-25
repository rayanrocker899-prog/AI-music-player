import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from './data/tracks';
import { BUILTIN_TRACKS } from './data/tracks';

export type Theme = 'light' | 'dark';
export type Tab = 'player' | 'library' | 'settings';
export type RepeatMode = 'off' | 'all' | 'one';
export type AssistantStatus = 'idle' | 'wake' | 'listening' | 'processing' | 'speaking' | 'unavailable';

export interface Settings {
  wakeWord: boolean;
  wakeSensitivity: number; // 0..1
  voiceResponses: boolean;
  vibrate: boolean;
  batterySaver: boolean;
  autoStart: boolean;
  keepScreenOn: boolean;
  musicFolder: string;
}

interface AppState {
  theme: Theme;
  tab: Tab;
  onboarded: boolean;
  settings: Settings;

  library: Track[];
  queue: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  playCounts: Record<string, number>;
  recentlyPlayed: string[];

  assistant: {
    status: AssistantStatus;
    transcript: string;
    caption: string;
    open: boolean;
    hint: string;
  };

  setTheme: (t: Theme) => void;
  setTab: (t: Tab) => void;
  setOnboarded: (v: boolean) => void;
  patchSettings: (p: Partial<Settings>) => void;
  addLocalTracks: (tracks: Track[]) => void;
  setQueue: (q: Track[], idx: number) => void;
  patchPlayer: (p: Partial<Pick<AppState, 'currentTrack' | 'isPlaying' | 'currentIndex' | 'queue' | 'shuffle' | 'repeat' | 'volume' | 'recentlyPlayed'>>) => void;
  bumpPlayCount: (id: string) => void;
  patchAssistant: (p: Partial<AppState['assistant']>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      tab: 'player',
      onboarded: false,
      settings: {
        wakeWord: true,
        wakeSensitivity: 0.6,
        voiceResponses: true,
        vibrate: true,
        batterySaver: false,
        autoStart: true,
        keepScreenOn: true,
        musicFolder: '/storage/emulated/0/Music',
      },

      library: BUILTIN_TRACKS,
      queue: BUILTIN_TRACKS,
      currentIndex: 0,
      currentTrack: BUILTIN_TRACKS[0],
      isPlaying: false,
      shuffle: false,
      repeat: 'off',
      volume: 0.8,
      playCounts: {},
      recentlyPlayed: [],

      assistant: { status: 'idle', transcript: '', caption: '', open: false, hint: '' },

      setTheme: (theme) => set({ theme }),
      setTab: (tab) => set({ tab }),
      setOnboarded: (onboarded) => set({ onboarded }),
      patchSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      addLocalTracks: (tracks) =>
        set((s) => {
          const ids = new Set(s.library.map((t) => t.id));
          const fresh = tracks.filter((t) => !ids.has(t.id));
          return { library: [...s.library, ...fresh], queue: [...s.queue, ...fresh] };
        }),
      setQueue: (queue, currentIndex) => set({ queue, currentIndex }),
      patchPlayer: (p) => set(p),
      bumpPlayCount: (id) =>
        set((s) => ({
          playCounts: { ...s.playCounts, [id]: (s.playCounts[id] ?? 0) + 1 },
          recentlyPlayed: [id, ...s.recentlyPlayed.filter((x) => x !== id)].slice(0, 20),
        })),
      patchAssistant: (p) => set((s) => ({ assistant: { ...s.assistant, ...p } })),
    }),
    {
      name: 'kitty-store',
      partialize: (s) => ({
        theme: s.theme, onboarded: s.onboarded, settings: s.settings,
        playCounts: s.playCounts, recentlyPlayed: s.recentlyPlayed,
        shuffle: s.shuffle, repeat: s.repeat, volume: s.volume,
      }),
      merge: (persisted, current) => ({ ...current, ...(persisted as object) }) as AppState,
    }
  )
);
