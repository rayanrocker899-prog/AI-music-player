import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Download, MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { requestInstall, useInstallState } from '../install';

export function InstallButton({ compact = false, subtle = false }: { compact?: boolean; subtle?: boolean }) {
  const install = useInstallState();
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);

  const startInstall = async () => {
    if (install.installed || busy) return;
    setBusy(true);
    const result = await requestInstall();
    setBusy(false);
    if (result === 'instructions') setInstructions(true);
  };

  return (
    <>
      <button
        onClick={startInstall}
        disabled={install.installed || busy}
        className={`${install.installed ? 'btn-neu on' : subtle ? 'btn-neu' : 'btn-accent'} ${
          compact ? 'px-4 h-10 text-[12px]' : 'w-full h-[52px] text-[14px]'
        } font-bold gap-2 disabled:opacity-80`}
        style={compact ? { borderRadius: 14 } : undefined}
      >
        {install.installed ? <Check size={17} /> : <Download size={17} />}
        {install.installed ? 'Installed' : busy ? 'Opening installer...' : 'Install Kitty'}
      </button>

      <AnimatePresence>
        {instructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={() => setInstructions(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 330, damping: 30 }}
              className="surface w-full max-w-[380px] p-5 pb-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src="/icons/icon.png" alt="" className="w-12 h-12 rounded-2xl" />
                  <div>
                    <h2 className="font-bold text-[18px]">Install Kitty</h2>
                    <p className="text-faint text-[11px]">No app store required</p>
                  </div>
                </div>
                <button className="btn-neu" style={{ width: 36, height: 36 }} onClick={() => setInstructions(false)} aria-label="Close">
                  <X size={15} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {install.platform === 'ios' ? (
                  <>
                    <InstallStep icon={<Share size={18} />} number="1" text="Open Kitty in Safari, then tap the Share button." />
                    <InstallStep icon={<PlusSquare size={18} />} number="2" text="Scroll down and choose Add to Home Screen." />
                    <InstallStep icon={<Check size={18} />} number="3" text="Tap Add. Kitty will open like a normal app." />
                  </>
                ) : (
                  <>
                    <InstallStep icon={<MoreVertical size={18} />} number="1" text="Open your browser menu in the top-right corner." />
                    <InstallStep icon={<Smartphone size={18} />} number="2" text="Choose Install app or Add to Home screen." />
                    <InstallStep icon={<Check size={18} />} number="3" text="Confirm Install. Kitty will appear in your app drawer." />
                  </>
                )}
              </div>

              <p className="text-faint text-[11px] leading-relaxed mt-6 text-center">
                Installation needs HTTPS and a supported browser. Use Chrome on Android or Safari on iPhone and iPad.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function InstallStep({ icon, number, text }: { icon: React.ReactNode; number: string; text: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="btn-neu shrink-0" style={{ width: 42, height: 42, borderRadius: 14, color: 'var(--accent)' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
          Step {number}
        </span>
        <p className="text-dim text-[12.5px] font-medium leading-snug mt-0.5">{text}</p>
      </div>
    </div>
  );
}