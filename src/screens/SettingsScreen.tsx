import { useState } from 'react';
import { BatteryCharging, Bell, Power, Cat, FolderOpen, Info, Moon, Music4, RefreshCw, Sun, Vibrate, AudioLines, Smartphone } from 'lucide-react';
import { useStore } from '../store';
import { Toggle, SectionLabel } from '../components/primitives';
import { InstallButton } from '../components/InstallApp';

function Row({
  icon,
  title,
  sub,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 px-1">
      <div
        className="btn-neu !cursor-default"
        style={{ width: 38, height: 38, borderRadius: 12, pointerEvents: 'none' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14px]">{title}</div>
        {sub && <div className="text-faint text-[11px] mt-0.5 leading-snug">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const ICON = { size: 17, strokeWidth: 2 };
const ACCENT = { color: 'var(--accent)' } as const;

export function SettingsScreen() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const settings = useStore((s) => s.settings);
  const patchSettings = useStore((s) => s.patchSettings);
  const setTab = useStore((s) => s.setTab);
  const [rescanMsg, setRescanMsg] = useState('');

  const rescan = () => {
    setRescanMsg('Library index rebuilt.');
    setTab('library');
    setTimeout(() => setRescanMsg(''), 2500);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pt-3 pb-44">
      <h1 className="text-[22px] font-bold mb-5 px-1">Settings</h1>

      <SectionLabel>Install on phone</SectionLabel>
      <div className="surface p-4 mb-6 flex items-center gap-3.5">
        <div className="btn-neu shrink-0 !cursor-default" style={{ width: 42, height: 42, borderRadius: 14, pointerEvents: 'none' }}>
          <Smartphone {...ICON} style={ACCENT} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px]">Kitty mobile app</div>
          <div className="text-faint text-[11px] mt-0.5">Android, iPhone and iPad</div>
        </div>
        <InstallButton compact />
      </div>

      <SectionLabel>Appearance</SectionLabel>
      <div className="surface p-4 mb-6">
        <div className="flex gap-3">
          {(['light', 'dark'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTheme(m)}
              className={`flex-1 h-[68px] rounded-2xl flex flex-col items-center justify-center gap-1.5 font-semibold text-[13px] transition-all ${
                theme === m ? 'btn-accent' : 'btn-neu'
              }`}
            >
              {m === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              {m === 'light' ? 'Neumorphic' : 'Glassmorphic'}
            </button>
          ))}
        </div>
        <p className="text-faint text-[11px] mt-3 text-center">
          Soft-raised light · frosted glass with glow accents in the dark
        </p>
      </div>

      <SectionLabel>Voice assistant</SectionLabel>
      <div className="surface px-4 divide-y mb-6" style={{ ['--tw-divide-opacity' as string]: 1 }}>
        <Row
          icon={<Cat {...ICON} style={ACCENT} />}
          title="Wake word — &quot;Hey Kitty&quot;"
          sub="Always-on, hands-free activation"
          right={<Toggle on={settings.wakeWord} onChange={(v) => patchSettings({ wakeWord: v })} label="Wake word" />}
        />
        <Row
          icon={<AudioLines {...ICON} style={ACCENT} />}
          title="Voice replies"
          sub="Kitty confirms commands out loud"
          right={<Toggle on={settings.voiceResponses} onChange={(v) => patchSettings({ voiceResponses: v })} label="Voice replies" />}
        />
        <Row
          icon={<Vibrate {...ICON} style={ACCENT} />}
          title="Vibrate on wake"
          right={<Toggle on={settings.vibrate} onChange={(v) => patchSettings({ vibrate: v })} label="Vibrate" />}
        />
        <div className="py-4 px-1">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-[14px]">Wake sensitivity</span>
            <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>
              {Math.round(settings.wakeSensitivity * 100)}%
            </span>
          </div>
          <input
            aria-label="Wake sensitivity"
            type="range"
            className="kitty-range"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.wakeSensitivity}
            style={{ ['--val' as string]: `${settings.wakeSensitivity * 100}%` }}
            onChange={(e) => patchSettings({ wakeSensitivity: parseFloat(e.target.value) })}
          />
          <div className="flex justify-between text-[10px] text-faint font-semibold">
            <span>Strict</span>
            <span>Eager</span>
          </div>
        </div>
      </div>

      <SectionLabel>Music library</SectionLabel>
      <div className="surface px-4 divide-y mb-6">
        <Row
          icon={<FolderOpen {...ICON} style={ACCENT} />}
          title="Music folder"
          sub={settings.musicFolder}
          right={
            <button className="btn-neu px-3.5 h-9 text-[12px] font-bold" style={{ borderRadius: 12 }} onClick={() => setTab('library')}>
              Change
            </button>
          }
        />
        <Row
          icon={<RefreshCw {...ICON} style={ACCENT} />}
          title="Rescan library"
          sub="Rebuild the local music index (MP3 · FLAC · M4A · WAV)"
          right={
            <button className="btn-neu px-3.5 h-9 text-[12px] font-bold" style={{ borderRadius: 12 }} onClick={rescan}>
              Rescan
            </button>
          }
        />
      </div>

      <SectionLabel>Power & system</SectionLabel>
      <div className="surface px-4 divide-y mb-6">
        <Row
          icon={<BatteryCharging {...ICON} style={ACCENT} />}
          title="Battery saver"
          sub="Calms the visualizer & trims wake polling"
          right={<Toggle on={settings.batterySaver} onChange={(v) => patchSettings({ batterySaver: v })} label="Battery saver" />}
        />
        <Row
          icon={<Power {...ICON} style={ACCENT} />}
          title="Auto-start on boot"
          sub="Resume listening when the phone turns on"
          right={<Toggle on={settings.autoStart} onChange={(v) => patchSettings({ autoStart: v })} label="Auto start" />}
        />
        <Row
          icon={<Bell {...ICON} style={ACCENT} />}
          title="Lock-screen player"
          sub="Media controls & album art via Media Session"
          right={<Toggle on={settings.keepScreenOn} onChange={(v) => patchSettings({ keepScreenOn: v })} label="Lock screen controls" />}
        />
      </div>

      <SectionLabel>About</SectionLabel>
      <div className="surface p-4 flex gap-3.5 items-start">
        <Music4 size={18} style={ACCENT} className="mt-0.5 shrink-0" />
        <p className="text-[12px] text-dim leading-relaxed">
          <strong style={{ color: 'var(--text)' }}>Kitty v1.0</strong> — plays only from your on-device library; no
          streaming, no account. Speech runs through Android's on-device recognizer where available. Background
          playback, lock-screen controls and the persistent notification use the OS Media Session —
          keep Chrome installed as an app (PWA) and exempt from battery optimization for the best hands-free range.
          {rescanMsg && <span style={{ color: 'var(--accent)' }}> {rescanMsg}</span>}
          <Info size={11} className="inline ml-1 opacity-60" />
        </p>
      </div>
    </div>
  );
}
