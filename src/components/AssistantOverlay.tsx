import { motion, AnimatePresence } from 'framer-motion';
import { Ear, X } from 'lucide-react';
import { useStore } from '../store';
import { assistant } from '../voice/assistant';

const QUICK = ['Play Believer', 'Next song', 'Play similar', 'Shuffle', 'Volume up', 'Help'];

export function AssistantOverlay() {
  const a = useStore((s) => s.assistant);
  const patch = useStore((s) => s.patchAssistant);
  const visible = a.open || a.status === 'listening' || a.status === 'processing' || a.status === 'speaking';

  const label =
    a.status === 'listening'
      ? 'Listening…'
      : a.status === 'processing'
        ? 'Thinking…'
        : a.status === 'speaking'
          ? 'Kitty'
          : a.status === 'unavailable'
            ? 'Voice unavailable'
            : 'Say "Hey Kitty"';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8"
          style={{
            background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
          }}
        >
          <button
            aria-label="Close assistant"
            className="btn-neu absolute top-4 right-4"
            style={{ width: 40, height: 40 }}
            onClick={() => { patch({ open: false }); if (a.status !== 'wake') patch({ status: 'wake' }); }}
          >
            <X size={17} />
          </button>

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative"
          >
            <div className={`assistant-orb w-[130px] h-[130px] rounded-full ${a.status === 'processing' ? 'animate-spin' : ''}`} style={a.status === 'processing' ? { animationDuration: '1.6s' } : undefined} />
            {a.status === 'listening' && (
              <>
                <span className="wake-ring" />
                <span className="wake-ring" style={{ animationDelay: '0.7s' }} />
                <span className="wake-ring" style={{ animationDelay: '1.3s' }} />
              </>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <Ear size={34} color="#fff" strokeWidth={1.6} style={{ filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.4))' }} />
            </div>
          </motion.div>

          <div className="mt-9 text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--accent)' }}>
            {label}
          </div>

          <div className="mt-3 min-h-[64px] text-center">
            {a.transcript && a.status !== 'speaking' ? (
              <p className="text-[19px] font-semibold leading-snug">&ldquo;{a.transcript}&rdquo;</p>
            ) : null}
            {a.caption && (
              <motion.p
                key={a.caption}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-[15px] leading-snug ${a.transcript ? 'text-dim mt-2' : 'font-semibold text-[17px]'}`}
              >
                {a.caption}
              </motion.p>
            )}
            {!a.transcript && !a.caption && a.status === 'listening' && (
              <p className="text-dim text-[15px]">Try one of these…</p>
            )}
          </div>

          {(a.status === 'listening' || a.status === 'wake') && (
            <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-[300px]">
              {QUICK.map((q) => (
                <button key={q} className="chip" onClick={() => assistant.handleCommand(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
