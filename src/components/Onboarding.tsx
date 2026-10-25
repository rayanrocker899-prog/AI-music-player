import { useState } from 'react';
import { motion } from 'framer-motion';
import { AudioLines, FolderOpen, Lock, Mic } from 'lucide-react';
import { useStore } from '../store';
import { assistant } from '../voice/assistant';
import { player } from '../audio/player';
import { InstallButton } from './InstallApp';

const PERKS = [
  { icon: Mic, text: 'Say "Hey Kitty" — play, pause, skip, all hands-free' },
  { icon: FolderOpen, text: 'Plays your device music — MP3, FLAC, WAV. No internet.' },
  { icon: Lock, text: 'Lock-screen & notification controls via Media Session' },
  { icon: AudioLines, text: 'Understands fuzzy names: "play shape of you" just works' },
];

export function Onboarding() {
  const [busy, setBusy] = useState(false);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const settings = useStore((s) => s.settings);

  const begin = async (withMic: boolean) => {
    if (busy) return;
    setBusy(true);
    player.engine.ensure(); // unlock audio inside the gesture
    if (withMic) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        if (settings.wakeWord) assistant.start();
      } catch {
        useStore.getState().patchAssistant({
          status: 'unavailable',
          open: true,
          caption: 'Mic permission was denied — allow it in Chrome to use "Hey Kitty".',
        });
      }
    }
    setOnboarded(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 app-root flex flex-col items-center justify-center px-9"
      style={{ background: 'var(--bg)' }}
    >
      <motion.img
        src="/icons/icon.png"
        alt="Kitty"
        className="w-[92px] h-[92px] rounded-[26px]"
        style={{ boxShadow: 'var(--raised), var(--glow)' }}
        initial={{ scale: 0.7, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      />
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="text-[34px] font-extrabold mt-6 tracking-tight"
      >
        Meet Kitty
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-dim text-center text-[14.5px] leading-relaxed mt-2 max-w-[300px]"
      >
        Your offline voice DJ. Hands full? Screen off? Just say the word.
      </motion.p>

      <div className="mt-8 space-y-3.5 w-full max-w-[320px]">
        {PERKS.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28 + i * 0.09 }}
            className="flex items-center gap-3.5"
          >
            <div className="btn-neu !cursor-default shrink-0" style={{ width: 40, height: 40, borderRadius: 14, pointerEvents: 'none' }}>
              <Icon size={17} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-[12.5px] text-dim font-medium leading-snug">{text}</p>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        onClick={() => begin(true)}
        disabled={busy}
        className="btn-accent mt-10 px-8 h-[54px] text-[15px] font-bold gap-2.5 disabled:opacity-60"
      >
        <Mic size={18} />
        {busy ? 'Waking Kitty…' : 'Enable voice control'}
      </motion.button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.76 }}
        className="mt-3"
      >
        <InstallButton compact subtle />
      </motion.div>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.86 }}
        onClick={() => begin(false)}
        className="mt-3 text-[13px] font-semibold text-dim underline underline-offset-4"
      >
        Continue without voice
      </motion.button>
    </motion.div>
  );
}
