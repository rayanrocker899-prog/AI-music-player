import { useStore } from '../store';
import { player } from '../audio/player';
import { bestMatch, detectWake, parseCommand, similarTo, type Command } from './fuzzy';
import { Emitter } from '../utils/misc';

type Events = { state: { active: boolean } };

const WAKE_HINTS = [
  '"Hey Kitty, play Believer"',
  '"Hey Kitty, next song"',
  '"Hey Kitty, play similar"',
  '"Hey Kitty, pause"',
  '"Hey Kitty, louder"',
];

class VoiceAssistant {
  events = new Emitter<Events>();
  private rec: SpeechRecognition | null = null;
  private running = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private activeUntil = 0;
  private commandBuffer = '';
  private debounce: ReturnType<typeof setTimeout> | null = null;
  hintIndex = 0;

  get supported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  get active() {
    return Date.now() < this.activeUntil;
  }

  /* ---------------- lifecycle ---------------- */

  start() {
    const s = useStore.getState();
    if (!this.supported) {
      s.patchAssistant({ status: 'unavailable', caption: 'Voice recognition needs Chrome on Android (with on-device speech).' });
      return;
    }
    if (this.rec) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;
    this.rec = new Ctor();
    this.rec.continuous = true;
    this.rec.interimResults = true;
    this.rec.lang = 'en-US';
    this.rec.maxAlternatives = 3;

    this.rec.onstart = () => {
      this.running = true;
      const st = useStore.getState();
      st.patchAssistant({ status: st.assistant.status === 'unavailable' ? 'unavailable' : 'wake' });
    };
    this.rec.onresult = (e) => this.onResult(e);
    this.rec.onerror = (e) => this.onError(e);
    this.rec.onend = () => {
      this.running = false;
      this.scheduleRestart();
    };

    try { this.rec.start(); } catch { /* already started */ }
  }

  stop() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = null;
    this.running = false;
    try { this.rec?.stop(); } catch { /* noop */ }
    this.rec = null;
    useStore.getState().patchAssistant({ status: 'idle', transcript: '' });
  }

  private scheduleRestart() {
    const s = useStore.getState();
    if (!s.settings.wakeWord || !this.rec) return;
    if (document.visibilityState !== 'visible') {
      // the OS may suspend mic capture when hidden; retry periodically
      this.restartTimer = setTimeout(() => this.safeRestart(), 1200);
      return;
    }
    this.restartTimer = setTimeout(() => this.safeRestart(), 250);
  }

  private safeRestart() {
    if (this.running || !this.rec) return;
    try { this.rec.start(); } catch { /* swallow */ }
  }

  /** user tapped the mic — jump straight into a command window */
  activateManual() {
    if (!this.supported) {
      useStore.getState().patchAssistant({ status: 'unavailable', open: true, caption: 'Voice recognition needs Chrome on Android.' });
      return;
    }
    if (!this.rec) this.start();
    this.beginActiveWindow('Listening…');
  }

  private beginActiveWindow(caption: string) {
    this.activeUntil = Date.now() + 9000;
    this.commandBuffer = '';
    useStore.getState().patchAssistant({ status: 'listening', caption, transcript: '' });
    this.events.emit('state', { active: true });
    if (useStore.getState().settings.vibrate) navigator.vibrate?.(24);
  }

  /* ---------------- recognition events ---------------- */

  private onResult(e: KittySpeechEvent) {
    const s = useStore.getState();
    let interim = '';
    const finals: string[] = [];
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finals.push(r[0].transcript);
      else interim += r[0].transcript;
    }
    const heard = (finals.join(' ') || interim).trim();
    if (!heard) return;

    if (this.active) {
      s.patchAssistant({ transcript: heard });
      if (finals.length) {
        this.commandBuffer = (this.commandBuffer + ' ' + finals.join(' ')).trim();
        if (this.debounce) clearTimeout(this.debounce);
        this.debounce = setTimeout(() => {
          const text = this.commandBuffer;
          this.commandBuffer = '';
          if (text) this.handleCommand(text);
        }, 480);
      }
    } else {
      const wake = detectWake(heard, s.settings.wakeSensitivity);
      if (wake !== null) {
        s.patchAssistant({ open: true, transcript: heard });
        if (wake) {
          this.activeUntil = Date.now() + 4000;
          this.handleCommand(wake);
        } else {
          this.beginActiveWindow('Yes? I\'m listening…');
        }
      }
    }
  }

  private onError(e: KittySpeechErrorEvent) {
    const s = useStore.getState();
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      s.patchAssistant({ status: 'unavailable', caption: 'Microphone permission denied — enable it in Chrome settings.', open: true });
      this.rec = null;
      return;
    }
    if (e.error === 'audio-capture') {
      s.patchAssistant({ status: 'unavailable', caption: 'No microphone found.' });
      return;
    }
    // 'no-speech' / 'network' / 'aborted' — the onend restart loop handles it
  }

  /* ---------------- command execution ---------------- */

  handleCommand(text: string) {
    const s = useStore.getState();
    s.patchAssistant({ status: 'processing', transcript: text });
    this.activeUntil = 0;
    this.events.emit('state', { active: false });

    const cmd = parseCommand(text);
    const reply = this.execute(cmd);
    this.say(reply);
  }

  private execute(cmd: Command): string {
    const s = useStore.getState();
    switch (cmd.type) {
      case 'play': {
        const m = bestMatch(cmd.query, s.library, s.playCounts);
        if (!m) return `I couldn't find "${cmd.query}" in your library. Try scanning your music folder.`;
        player.playTrack(m.track);
        return m.score > 0.9
          ? `Playing ${m.track.title} by ${m.track.artist}.`
          : `Playing ${m.track.title} — best match for "${cmd.query}".`;
      }
      case 'pause':
        player.pause();
        return 'Paused.';
      case 'resume':
        player.resume();
        return 'Resuming.';
      case 'stop':
        player.stopPlayback();
        return 'Stopped.';
      case 'next':
        player.next();
        return 'Skipping ahead.';
      case 'previous':
        player.prev();
        return 'Going back.';
      case 'similar': {
        const cur = s.currentTrack;
        if (!cur) return 'Play a song first and I can find ones like it.';
        const t = similarTo(cur, s.library, s.playCounts);
        if (!t) return 'Nothing similar found in your library yet.';
        player.playTrack(t);
        return `Playing ${t.title} — it matches ${cur.artist === t.artist ? 'the same artist' : `the ${t.genre} vibe`}.`;
      }
      case 'shuffleOn':
        player.setShuffle(true);
        return 'Shuffle on.';
      case 'shuffleOff':
        player.setShuffle(false);
        return 'Shuffle off.';
      case 'repeat': {
        const mode = player.cycleRepeat();
        return mode === 'off' ? 'Repeat off.' : mode === 'all' ? 'Repeating everything.' : 'Repeating this song.';
      }
      case 'volumeUp':
        player.volumeUp();
        return `Volume ${Math.round(useStore.getState().volume * 100)} percent.`;
      case 'volumeDown':
        player.volumeDown();
        return `Volume ${Math.round(useStore.getState().volume * 100)} percent.`;
      case 'volumeSet':
        player.setVolume(cmd.value);
        return `Volume set to ${Math.round(cmd.value * 100)} percent.`;
      case 'whatsPlaying': {
        const t = s.currentTrack;
        return t ? `This is ${t.title} by ${t.artist}.` : 'Nothing is playing right now.';
      }
      case 'help':
        return 'Try: play Believer, pause, next song, play similar, shuffle, louder, or volume to fifty.';
      default:
        return `Sorry, I don't know "${cmd.raw}" yet. Say help for ideas.`;
    }
  }

  /* ---------------- speech output ---------------- */

  say(text: string) {
    const s = useStore.getState();
    const finish = () => {
      window.setTimeout(() => {
        useStore.getState().patchAssistant({ status: 'wake', open: false });
      }, 1400);
    };
    s.patchAssistant({ caption: text, status: s.settings.voiceResponses ? 'speaking' : 'wake' });
    if (s.settings.voiceResponses && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.04;
      u.pitch = 1.05;
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
    } else {
      finish();
    }
  }
}

export const assistant = new VoiceAssistant();

/* settings reactions */
useStore.subscribe((state, prev) => {
  if (state.settings.wakeWord !== prev.settings.wakeWord) {
    if (state.settings.wakeWord && state.onboarded) assistant.start();
    else assistant.stop();
  }
});

export { WAKE_HINTS };
