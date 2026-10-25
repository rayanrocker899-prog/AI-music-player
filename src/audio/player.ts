import { SynthEngine } from './engine';
import { useStore, type RepeatMode } from '../store';
import { getArt } from '../utils/art';
import { clamp, Emitter } from '../utils/misc';
import type { Track } from '../data/tracks';

type Events = { time: { pos: number; dur: number } };

/**
 * PlayerController — single source of truth for playback.
 * Built-in tracks render through the offline SynthEngine; scanned
 * device files play through a media element routed into the same bus,
 * so the visualizer and Media Session work for both.
 */
class PlayerController {
  engine = new SynthEngine();
  events = new Emitter<Events>();
  private el: HTMLAudioElement | null = null;
  private elSource: MediaElementAudioSourceNode | null = null;
  private mode: 'synth' | 'file' = 'synth';
  private raf = 0;
  private wakeLock: { release: () => Promise<void> } | null = null;

  constructor() {
    this.engine.onEnded = () => this.next(true);
  }

  get analyser() {
    this.engine.ensure();
    return this.engine.analyser;
  }

  /* ---------------- transport ---------------- */

  playTrack(track: Track, opts: { announce?: boolean } = {}) {
    const s = useStore.getState();
    const queue = s.queue.some((t) => t.id === track.id) ? s.queue : [...s.queue, track];
    const idx = queue.findIndex((t) => t.id === track.id);
    s.patchPlayer({ currentTrack: track, queue, currentIndex: idx, isPlaying: true });
    s.bumpPlayCount(track.id);
    this.startAudio(track);
    this.updateMediaSession();
    this.acquireWakeLock();
    void opts;
  }

  private startAudio(track: Track) {
    if (track.source === 'local' && track.fileUrl) {
      this.mode = 'file';
      this.engine.stop();
      this.ensureElement();
      if (this.el!.src !== track.fileUrl) this.el!.src = track.fileUrl;
      this.el!.currentTime = 0;
      this.el!.play().catch(() => {});
    } else {
      this.mode = 'synth';
      if (this.el) this.el.pause();
      this.engine.setVolume(useStore.getState().volume);
      this.engine.load(track);
      this.engine.play(0);
    }
    this.startTicker();
  }

  private ensureElement() {
    this.engine.ensure();
    if (!this.el) {
      this.el = new Audio();
      this.el.crossOrigin = 'anonymous';
      this.elSource = this.engine.ctx!.createMediaElementSource(this.el);
      this.elSource.connect(this.engine.bus);
      this.el.addEventListener('ended', () => this.next(true));
    }
    this.el.volume = 1; // gain handled by engine bus
  }

  toggle() {
    const s = useStore.getState();
    if (!s.currentTrack) {
      const first = s.queue[0];
      if (first) this.playTrack(first);
      return;
    }
    if (s.isPlaying) this.pause();
    else this.resume();
  }

  pause() {
    const s = useStore.getState();
    if (!s.isPlaying) return;
    if (this.mode === 'synth') this.engine.pause();
    else this.el?.pause();
    s.patchPlayer({ isPlaying: false });
    this.releaseWakeLock();
    this.updatePositionState();
  }

  resume() {
    const s = useStore.getState();
    if (s.isPlaying || !s.currentTrack) return;
    if (this.mode === 'synth') {
      this.engine.ensure();
      if (!this.engine.duration) this.engine.load(s.currentTrack);
      this.engine.resume();
    } else {
      this.el?.play().catch(() => {});
    }
    s.patchPlayer({ isPlaying: true });
    this.acquireWakeLock();
    this.startTicker();
  }

  stopPlayback() {
    const s = useStore.getState();
    if (this.mode === 'synth') this.engine.stop();
    else if (this.el) { this.el.pause(); this.el.currentTime = 0; }
    s.patchPlayer({ isPlaying: false });
    this.releaseWakeLock();
  }

  next(auto = false) {
    const s = useStore.getState();
    const { queue, currentIndex, repeat, shuffle } = s;
    if (!queue.length) return;

    if (auto && repeat === 'one') {
      this.seekTo(0);
      if (this.mode === 'synth') this.engine.play(0);
      else this.el?.play().catch(() => {});
      return;
    }

    let idx: number;
    if (shuffle && queue.length > 2) {
      do { idx = Math.floor(Math.random() * queue.length); } while (idx === currentIndex);
    } else {
      idx = currentIndex + 1;
      if (idx >= queue.length) {
        if (auto && repeat === 'off') { this.stopPlayback(); return; }
        idx = 0;
      }
    }
    this.playTrack(queue[idx]);
  }

  prev() {
    if (this.getPosition() > 3.5) { this.seekTo(0); return; }
    const s = useStore.getState();
    const { queue, currentIndex } = s;
    if (!queue.length) return;
    const idx = (currentIndex - 1 + queue.length) % queue.length;
    this.playTrack(queue[idx]);
  }

  seekTo(sec: number) {
    const dur = this.getDuration();
    const t = clamp(sec, 0, Math.max(0, dur - 0.05));
    if (this.mode === 'synth') this.engine.seek(t);
    else if (this.el) this.el.currentTime = t;
    this.events.emit('time', { pos: t, dur });
    this.updatePositionState();
  }

  setVolume(v: number) {
    const vol = clamp(v, 0, 1);
    useStore.getState().patchPlayer({ volume: vol });
    this.engine.setVolume(vol);
  }

  volumeUp(step = 0.15) {
    this.setVolume(useStore.getState().volume + step);
  }
  volumeDown(step = 0.15) {
    this.setVolume(useStore.getState().volume - step);
  }

  setShuffle(on: boolean) {
    useStore.getState().patchPlayer({ shuffle: on });
  }
  cycleRepeat() {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const cur = useStore.getState().repeat;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    useStore.getState().patchPlayer({ repeat: next });
    return next;
  }

  getPosition(): number {
    return this.mode === 'synth' ? this.engine.getPosition() : this.el?.currentTime ?? 0;
  }
  getDuration(): number {
    return this.mode === 'synth' ? this.engine.duration : this.el?.duration ?? useStore.getState().currentTrack?.duration ?? 0;
  }
  isPlayingMode() { return this.mode; }

  private startTicker() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (useStore.getState().isPlaying) {
        this.events.emit('time', { pos: this.getPosition(), dur: this.getDuration() });
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /* ---------------- media session (lock screen / notification) ---------------- */

  updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const track = useStore.getState().currentTrack;
    if (!track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: `${track.album} • Kitty`,
        artwork: [96, 256, 512].map((size) => ({
          src: getArt(track, Math.max(size, 512)),
          sizes: `${size}x${size}`,
          type: 'image/png',
        })),
      });
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('stop', () => this.stopPlayback());
      navigator.mediaSession.setActionHandler('seekto', (d) => {
        if (d.seekTime != null) this.seekTo(d.seekTime);
      });
      this.updatePositionState();
    } catch { /* unsupported */ }
  }

  private updatePositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: this.getDuration() || 0,
        playbackRate: 1,
        position: clamp(this.getPosition(), 0, this.getDuration() || 0),
      });
    } catch { /* noop */ }
  }

  /* ---------------- wake lock ---------------- */

  private async acquireWakeLock() {
    const s = useStore.getState();
    if (!s.settings.keepScreenOn) return;
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock && document.visibilityState === 'visible') {
        this.wakeLock = await nav.wakeLock.request('screen');
      }
    } catch { /* noop */ }
  }
  private releaseWakeLock() {
    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
  }
}

export const player = new PlayerController();

/* re-acquire wake lock + refresh media session when returning to the app */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && useStore.getState().isPlaying) {
    player.updateMediaSession();
  }
});
