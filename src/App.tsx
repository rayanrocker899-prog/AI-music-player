import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import { PhoneFrame, StatusBar } from './components/PhoneFrame';
import { PlayerScreen } from './screens/PlayerScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { AssistantOverlay } from './components/AssistantOverlay';
import { Onboarding } from './components/Onboarding';
import { getArt } from './utils/art';
import { assistant } from './voice/assistant';
import { Cat } from 'lucide-react';

export default function App() {
  const theme = useStore((s) => s.theme);
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const onboarded = useStore((s) => s.onboarded);
  const track = useStore((s) => s.currentTrack);

  /* auto-start the wake listener (mirrors "start on boot") */
  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get('view');
    if (requestedView === 'player' || requestedView === 'library' || requestedView === 'settings') {
      setTab(requestedView);
    }
    const { wakeWord, autoStart } = useStore.getState().settings;
    if (useStore.getState().onboarded && wakeWord && autoStart) {
      assistant.start();
    }
  }, [setTab]);

  return (
    <div className="page-shell">
      <PhoneFrame>
        <div className={`app-root theme-${theme} absolute inset-0 overflow-hidden`}>
          {/* dark mode: blurred album art as the living background */}
          {theme === 'dark' && track && (
            <AnimatePresence>
              <motion.img
                key={track.id}
                src={getArt(track)}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                style={{ filter: 'blur(70px) saturate(1.7) brightness(0.5)', transform: 'scale(1.35)' }}
                draggable={false}
              />
            </AnimatePresence>
          )}
          {theme === 'dark' && (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(4,4,10,0.5) 0%, rgba(4,4,10,0.78) 60%, rgba(4,4,10,0.9) 100%)' }}
            />
          )}

          <div className="relative flex flex-col h-full">
            <StatusBar />
            <main className="flex-1 min-h-0 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 16, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  {tab === 'player' && <PlayerScreen />}
                  {tab === 'library' && <LibraryScreen />}
                  {tab === 'settings' && <SettingsScreen />}
                </motion.div>
              </AnimatePresence>
            </main>
            <div className="px-4 pb-4 pt-2 space-y-3 shrink-0 safe-bottom">
              <MiniPlayer />
              <BottomNav />
            </div>
          </div>

          <AssistantOverlay />
          {!onboarded && <Onboarding />}
        </div>
      </PhoneFrame>

      {/* desktop-only ambient caption */}
      <div className="hidden md:flex flex-col items-start gap-3 max-w-[300px] ml-14 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Cat size={17} className="text-cyan-300" />
          </div>
          <span className="text-white/90 font-bold text-lg tracking-tight">Kitty</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80 border border-cyan-300/30 rounded-full px-2.5 py-1">
            Offline voice DJ
          </span>
        </div>
        <p className="text-white/45 text-[13px] leading-relaxed">
          An always-listening music companion for Android. Try the mic — say{' '}
          <span className="text-white/80 font-semibold">&ldquo;Hey Kitty, play Believer&rdquo;</span> — then lock your
          screen: controls ride along via Media Session.
        </p>
      </div>
    </div>
  );
}
