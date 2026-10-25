import { cn } from '../utils/cn';

/** Round themed icon button (neumorphic raised / frosted glass) */
export function RoundBtn({
  size = 52,
  active = false,
  accent = false,
  className,
  children,
  onClick,
  label,
}: {
  size?: number;
  active?: boolean;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(accent ? 'btn-accent' : 'btn-neu', active && !accent && 'on', className)}
      style={{ width: size, height: size }}
    >
      {children}
    </button>
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn('switch', on && 'on')}
      onClick={() => onChange(!on)}
    />
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-faint px-1 mb-3">
      {children}
    </div>
  );
}
