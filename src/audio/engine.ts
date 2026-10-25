import { mulberry32, hashString, clamp } from '../utils/misc';
import type { Track, Mood } from '../data/tracks';

interface MoodParams {
  cutoff: number;
  hatEvery: number; // steps between hats
  kickSteps: number[]; // steps in a 16-step bar
  snareSteps: number[];
  leadDensity: number; // 0..1 probability per step
  bass16: boolean; // driving 16th bass
  padGain: number;
  leadGain: number;
  bassGain: number;
  swing: number;
}

const MOODS: Record<Mood, MoodParams> = {
  energetic: { cutoff: 5200, hatEvery: 2, kickSteps: [0, 4, 8, 12], snareSteps: [4, 12], leadDensity: 0.5, bass16: false, padGain: 0.05, leadGain: 0.16, bassGain: 0.3, swing: 0 },
  bright: { cutoff: 6200, hatEvery: 2, kickSteps: [0, 8, 10], snareSteps: [4, 12], leadDensity: 0.55, bass16: false, padGain: 0.055, leadGain: 0.15, bassGain: 0.26, swing: 0.06 },
  chill: { cutoff: 2600, hatEvery: 4, kickSteps: [0, 7, 10], snareSteps: [8], leadDensity: 0.34, bass16: false, padGain: 0.09, leadGain: 0.11, bassGain: 0.24, swing: 0.12 },
  dark: { cutoff: 3200, hatEvery: 2, kickSteps: [0, 4, 8, 12], snareSteps: [4, 12], leadDensity: 0.42, bass16: true, padGain: 0.05, leadGain: 0.12, bassGain: 0.3, swing: 0 },
  synth: { cutoff: 4600, hatEvery: 4, kickSteps: [0, 4, 8, 12], snareSteps: [4, 12], leadDensity: 0.4, bass16: true, padGain: 0.07, leadGain: 0.14, bassGain: 0.28, swing: 0 },
};

const MAJOR_PENT = [0, 2, 4, 7, 9];
const MINOR_PENT = [0, 3, 5, 7, 10];

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Patterns {
  chords: number[][]; // 4 bars of chord midi arrays
  bassRoots: number[];
  melody: (number | null)[]; // per-step midi or rest, 4 bars
  drumBar: { kick: number[]; snare: number[]; hat: boolean[]; hatOpen: boolean[] };
}

/**
 * SynthEngine — renders seeded, genre-flavoured compositions with the
 * Web Audio API so the demo library plays 100% offline.
 */
export class SynthEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  analyser: AnalyserNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private track: Track | null = null;
  private patterns: Patterns | null = null;
  private stepDur = 0.125;
  private totalSteps = 0;

  private timer: ReturnType<typeof setInterval> | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  private startCtxTime = 0;
  private seekBase = 0;
  private nextStep = 0;
  private nextTime = 0;
  private volume = 0.8;
  playing = false;

  onEnded: (() => void) | null = null;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16;
      this.comp.ratio.value = 5;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;
      this.master.connect(this.comp);
      this.comp.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // shared noise buffer
      const len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** entry point other sources (media elements) can route through */
  get bus(): GainNode {
    this.ensure();
    return this.master!;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
    }
  }

  load(track: Track) {
    this.ensure();
    this.track = track;
    this.stepDur = 60 / track.bpm / 4;
    this.totalSteps = Math.round(track.duration / this.stepDur);
    this.patterns = this.compose(track);
  }

  private compose(track: Track): Patterns {
    const rnd = mulberry32(hashString(track.id) ^ (track.seed * 2654435761));
    const mp = MOODS[track.mood];
    const scale = track.mood === 'bright' || track.mood === 'energetic' ? MAJOR_PENT : MINOR_PENT;
    const root = 48 + Math.floor(rnd() * 6); // C3..F3 region

    // chord progression: 4 bars of triads on scale degrees
    const degSets = [
      [0, 3, 4, 2], [0, 2, 3, 4], [0, 4, 3, 4], [1, 3, 0, 4],
    ];
    const degrees = degSets[Math.floor(rnd() * degSets.length)];
    const third = track.mood === 'bright' || track.mood === 'energetic' ? 4 : 3;
    const chordAt = (deg: number) => {
      const base = root + scale[deg % scale.length] + 12 * Math.floor(deg / scale.length);
      return [base, base + third, base + 7, base + 12].map((n) => n + 12);
    };
    const chords = degrees.map((d) => chordAt(d));
    const bassRoots = degrees.map((d) => root + scale[d % scale.length] - 12);

    // drum bar
    const hat: boolean[] = new Array(16).fill(false);
    const hatOpen: boolean[] = new Array(16).fill(false);
    for (let s = 0; s < 16; s += mp.hatEvery) hat[s] = true;
    if (mp.hatEvery <= 2) { hatOpen[14] = true; hat[14] = true; }

    // melody: 4 bars of seeded random-walk
    const melody: (number | null)[] = new Array(64).fill(null);
    let cur = root + 24 + scale[Math.floor(rnd() * scale.length)];
    for (let bar = 0; bar < 4; bar++) {
      for (let s = 0; s < 16; s++) {
        const phrasePos = s % 16;
        const strong = phrasePos === 0 || phrasePos === 8;
        if (rnd() < mp.leadDensity || strong) {
          if (rnd() < 0.75) melody[bar * 16 + s] = cur;
          const move = Math.floor(rnd() * 5) - 2;
          cur = root + 24 + scale[clamp(scale.indexOf(cur - root - 24) + move, 0, scale.length - 1)] + (rnd() < 0.2 ? 12 : 0);
        }
      }
    }
    return { chords, bassRoots, melody, drumBar: { kick: mp.kickSteps, snare: mp.snareSteps, hat, hatOpen } };
  }

  /* ------------ voices ------------- */
  private reg<T extends AudioScheduledSourceNode>(n: T): T {
    this.sources.add(n);
    n.onended = () => this.sources.delete(n);
    return n;
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = this.reg(ctx.createOscillator());
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(this.master!);
    o.start(t); o.stop(t + 0.24);
  }

  private snare(t: number) {
    const ctx = this.ctx!;
    const src = this.reg(ctx.createBufferSource());
    src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t); src.stop(t + 0.18);
  }

  private hat(t: number, open: boolean) {
    const ctx = this.ctx!;
    const src = this.reg(ctx.createBufferSource());
    src.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7600;
    const g = ctx.createGain();
    const dur = open ? 0.14 : 0.035;
    g.gain.setValueAtTime(open ? 0.22 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp).connect(g).connect(this.master!);
    src.start(t); src.stop(t + dur + 0.02);
  }

  private bass(t: number, midi: number, dur: number) {
    const ctx = this.ctx!;
    const mp = MOODS[this.track!.mood];
    const o = this.reg(ctx.createOscillator());
    o.type = this.track!.mood === 'chill' ? 'triangle' : 'sawtooth';
    o.frequency.value = midiToFreq(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(mp.cutoff * 0.24, t);
    lp.frequency.exponentialRampToValueAtTime(mp.cutoff * 0.08, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(mp.bassGain, t + 0.012);
    g.gain.setValueAtTime(mp.bassGain, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp).connect(g).connect(this.master!);
    o.start(t); o.stop(t + dur + 0.02);
  }

  private pad(t: number, midis: number[], dur: number) {
    const ctx = this.ctx!;
    const mp = MOODS[this.track!.mood];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(mp.padGain, t + dur * 0.3);
    g.gain.setValueAtTime(mp.padGain, t + dur * 0.75);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = mp.cutoff * 0.35;
    g.connect(lp).connect(this.master!);
    midis.forEach((m) => {
      [-6, 6].forEach((det) => {
        const o = this.reg(ctx.createOscillator());
        o.type = 'sawtooth';
        o.frequency.value = midiToFreq(m);
        o.detune.value = det;
        o.connect(g);
        o.start(t); o.stop(t + dur + 0.05);
      });
    });
  }

  private lead(t: number, midi: number, dur: number) {
    const ctx = this.ctx!;
    const mp = MOODS[this.track!.mood];
    const o = this.reg(ctx.createOscillator());
    o.type = this.track!.mood === 'synth' ? 'square' : 'triangle';
    o.frequency.value = midiToFreq(midi);
    const o2 = this.reg(ctx.createOscillator());
    o2.type = 'sine';
    o2.frequency.value = midiToFreq(midi + 12);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = mp.cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(mp.leadGain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.6);
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(lp).connect(this.master!);
    o.start(t); o.stop(t + dur * 1.7);
    o2.start(t); o2.stop(t + dur * 1.7);
  }

  /* ------------ transport ------------- */
  private scheduleStep(step: number, t: number) {
    const p = this.patterns!;
    const mp = MOODS[this.track!.mood];
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const barLen = this.stepDur * 16;
    const barStart = t - s * this.stepDur;

    const swing = s % 2 === 1 ? mp.swing * this.stepDur : 0;
    const tt = t + swing;

    if (s === 0) {
      this.pad(barStart, p.chords[bar], barLen);
    }
    if (p.drumBar.kick.includes(s)) this.kick(tt);
    if (p.drumBar.snare.includes(s)) this.snare(tt);
    if (p.drumBar.hat[s]) this.hat(tt, p.drumBar.hatOpen[s]);

    // bass
    if (mp.bass16) {
      this.bass(tt, p.bassRoots[bar], this.stepDur * 0.9);
    } else if (s % 4 === 0 || (s % 8 === 6 && Math.floor(step / 16) % 2 === 1)) {
      this.bass(tt, p.bassRoots[bar] + (s === 12 ? 7 : 0), this.stepDur * 3);
    }

    const m = p.melody[(bar * 16 + s) % 64];
    if (m !== null) this.lead(tt, m, this.stepDur * (s % 8 === 0 ? 3 : 1.5));
  }

  play(offset = 0) {
    if (!this.track || !this.patterns) return;
    this.ensure();
    const ctx = this.ctx!;
    this.stopTimer();
    this.seekBase = offset;
    this.startCtxTime = ctx.currentTime;
    this.nextStep = Math.floor(offset / this.stepDur);
    this.nextTime = ctx.currentTime + 0.08;
    this.playing = true;
    const lookahead = 0.16;
    this.timer = setInterval(() => {
      while (this.nextTime < ctx.currentTime + lookahead) {
        if (this.nextStep >= this.totalSteps) {
          this.finish();
          return;
        }
        this.scheduleStep(this.nextStep, Math.max(this.nextTime, ctx.currentTime + 0.005));
        this.nextStep++;
        this.nextTime += this.stepDur;
      }
    }, 32);
  }

  private stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private killSources() {
    this.sources.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    this.sources.clear();
  }

  pause(): number {
    const pos = this.getPosition();
    this.playing = false;
    this.stopTimer();
    this.killSources();
    this.seekBase = pos; // remember where we stopped so resume continues
    if (this.ctx) this.startCtxTime = this.ctx.currentTime;
    return pos;
  }

  resume() {
    if (this.track) this.play(this.getPosition());
  }

  seek(sec: number) {
    const wasPlaying = this.playing;
    this.stopTimer();
    this.killSources();
    const target = clamp(sec, 0, this.track ? this.track.duration - 0.05 : sec);
    if (wasPlaying) this.play(target);
    else { this.seekBase = target; this.startCtxTime = this.ctx ? this.ctx.currentTime : 0; this.nextStep = Math.floor(target / this.stepDur); }
  }

  stop() {
    this.playing = false;
    this.stopTimer();
    this.killSources();
    this.seekBase = 0;
    this.nextStep = 0;
  }

  private finish() {
    this.stop();
    this.onEnded?.();
  }

  getPosition(): number {
    if (!this.ctx || !this.playing) return this.seekBase;
    return this.seekBase + (this.ctx.currentTime - this.startCtxTime);
  }

  get duration(): number {
    return this.track?.duration ?? 0;
  }
}
