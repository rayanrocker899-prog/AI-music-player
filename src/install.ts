import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPlatform = 'android' | 'ios' | 'desktop' | 'unknown';

interface InstallSnapshot {
  canPrompt: boolean;
  installed: boolean;
  platform: InstallPlatform;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function platform(): InstallPlatform {
  const ua = navigator.userAgent.toLowerCase();
  const ipadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(ua) || ipadDesktopMode) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua)) return 'desktop';
  return 'unknown';
}

function isInstalled() {
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

function emit() {
  listeners.forEach((listener) => listener());
}

let snapshot: InstallSnapshot = {
  canPrompt: false,
  installed: typeof window !== 'undefined' ? isInstalled() : false,
  platform: typeof navigator !== 'undefined' ? platform() : 'unknown',
};

function refresh() {
  snapshot = {
    canPrompt: Boolean(deferredPrompt),
    installed: isInstalled(),
    platform: platform(),
  };
  emit();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  refresh();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  refresh();
});

window.matchMedia('(display-mode: standalone)').addEventListener?.('change', refresh);

export async function requestInstall(): Promise<'accepted' | 'dismissed' | 'instructions' | 'installed'> {
  if (isInstalled()) return 'installed';
  if (!deferredPrompt) return 'instructions';

  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  refresh();
  return choice.outcome;
}

export function useInstallState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot
  );
}