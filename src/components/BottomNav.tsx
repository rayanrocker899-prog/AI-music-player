import { Disc3, Library, Mic, Settings2 } from 'lucide-react';
import { useStore, type Tab } from '../store';
import { assistant } from '../voice/assistant';

const TABS: { id: Tab; icon: typeof Disc3; label: string }[] = [
  { id: 'player', icon: Disc3, label: 'Player' },
  { id: 'library', icon: Library, label: 'Library' },
  { id: 'settings', icon: Settings2, label: 'Settings' },
];

export function BottomNav() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const isPlaying = useStore((s) => s.isPlaying);
  const status = useStore((s) => s.assistant.status);
  const wakeOn = useStore((s) => s.settings.wakeWord);

  return (
    <div className="relative">
      {/* mic FAB */}
      <button
        aria-label="Talk to Kitty"
        onClick={() => assistant.activateManual()}
        className="btn-accent absolute left-1/2 -translate-x-1/2 -top-7 z-10"
        style={{ width: 62, height: 62 }}
      >
        {(wakeOn && (status === 'wake' || status === 'listening')) && (
          <>
            <span className="wake-ring" />
            <span className="wake-ring" style={{ animationDelay: '0.9s' }} />
          </>
        )}
        <Mic size={24} strokeWidth={2.2} className={status === 'listening' ? 'animate-pulse' : ''} />
      </button>

      <div className="surface flex items-end justify-around px-4 pt-3 pb-2.5" style={{ borderRadius: 26 }}>
        {TABS.slice(0, 2).map(({ id, icon: Icon, label }) => (
          <NavItem key={id} active={tab === id} onClick={() => setTab(id)} icon={<Icon size={20} strokeWidth={2.1} />} label={label} pulse={id === 'player' && isPlaying && tab !== 'player'} />
        ))}
        <div className="w-16" />
        {TABS.slice(2).map(({ id, icon: Icon, label }) => (
          <NavItem key={id} active={tab === id} onClick={() => setTab(id)} icon={<Icon size={20} strokeWidth={2.1} />} label={label} />
        ))}
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, pulse }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; pulse?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 w-14 group">
      <span
        className="transition-colors"
        style={{ color: active ? 'var(--accent)' : 'var(--faint)' }}
      >
        <span className={pulse ? 'relative flex' : 'flex'}>
          {icon}
          {pulse && (
            <span
              className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full"
              style={{ background: 'var(--accent)', boxShadow: 'var(--glow)' }}
            />
          )}
        </span>
      </span>
      <span
        className="text-[9.5px] font-bold uppercase tracking-wider transition-colors"
        style={{ color: active ? 'var(--accent)' : 'var(--faint)' }}
      >
        {label}
      </span>
    </button>
  );
}
