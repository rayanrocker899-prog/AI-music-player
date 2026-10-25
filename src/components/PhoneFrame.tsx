import { useEffect, useState } from 'react';
import { BatteryMedium, Signal, Wifi } from 'lucide-react';
import { useStore } from '../store';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function StatusBar() {
  const now = useClock();
  const wakeOn = useStore((s) => s.settings.wakeWord);
  const status = useStore((s) => s.assistant.status);
  const hh = now.getHours();
  const mm = now.getMinutes().toString().padStart(2, '0');
  return (
    <div className="flex items-center justify-between px-7 pt-4 pb-2 text-[12px] font-bold shrink-0 select-none">
      <span>{((hh % 12) || 12)}:{mm}</span>
      <div className="flex items-center gap-1.5">
        {wakeOn && status !== 'unavailable' && (
          <span className="flex items-center gap-1.5 mr-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--accent)', boxShadow: 'var(--glow)' }}
            />
            <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
              {status === 'listening' ? 'Listening' : 'Hey Kitty'}
            </span>
          </span>
        )}
        <Signal size={13} />
        <Wifi size={13} />
        <BatteryMedium size={15} />
      </div>
    </div>
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full h-full md:w-[402px] md:h-[min(94vh,872px)] md:rounded-[46px] md:p-[10px] relative z-10"
      style={{ background: 'transparent' }}
    >
      {/* bezel on desktop */}
      <div className="hidden md:block absolute inset-0 rounded-[46px] bg-[#101016] shadow-[0_40px_120px_rgba(0,0,0,0.65),inset_0_0_0_2px_rgba(255,255,255,0.07)]" />
      <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[22px] w-28 h-[22px] bg-[#101016] rounded-full z-30" />
      <div className="relative w-full h-full md:rounded-[38px] overflow-hidden z-20">
        {children}
      </div>
    </div>
  );
}
