import { normalize, sim } from '../utils/misc';
import type { Track } from '../data/tracks';

/* ---------------- wake word ---------------- */

const WAKE_VARIANTS = [
  'hey kitty', 'ok kitty', 'okay kitty', 'a kitty', 'hey katie', 'hey katy',
  'hey kiddie', 'hey kittie', 'hey kitty kitty', 'kitty',
];

/** returns command text left after the wake phrase, or null when no wake word */
export function detectWake(transcript: string, sensitivity: number): string | null {
  const t = ' ' + normalize(transcript) + ' ';
  for (const v of WAKE_VARIANTS) {
    const needle = ' ' + v + ' ';
    const idx = t.indexOf(needle);
    if (idx !== -1) return t.slice(idx + needle.length).trim();
  }
  if (sensitivity > 0.25) {
    // fuzzy pass: slide a window over words to tolerate recognition errors
    const words = normalize(transcript).split(' ');
    for (let i = 0; i < words.length; i++) {
      const two = words.slice(i, i + 2).join(' ');
      if (!two) continue;
      const score = Math.max(sim(two, 'hey kitty'), sim(two, 'ok kitty'));
      const threshold = 0.9 - sensitivity * 0.35;
      if (score >= threshold) {
        return words.slice(i + 2).join(' ');
      }
    }
  }
  return null;
}

/* ---------------- fuzzy library matching ---------------- */

export function scoreTrack(query: string, track: Track): number {
  const q = normalize(query);
  if (!q) return 0;
  const title = normalize(track.title);
  const artist = normalize(track.artist);
  const album = normalize(track.album);

  let score = 0;

  if (title === q) score = 1;
  else if (title.includes(q)) score = 0.72 + 0.25 * (q.length / title.length);
  else if (q.includes(title)) score = 0.7 + 0.25 * (title.length / q.length);
  else {
    // best sliding-window similarity against the title
    const qw = q.split(' ');
    const tw = title.split(' ');
    let best = 0;
    for (let span = Math.max(1, qw.length - 1); span <= Math.min(tw.length, qw.length + 1); span++) {
      for (let i = 0; i + span <= tw.length; i++) {
        best = Math.max(best, sim(q, tw.slice(i, i + span).join(' ')));
      }
    }
    best = Math.max(best, sim(q, title) * 0.96);
    score = best;
  }

  // secondary signal from artist / album
  if (artist && (artist.includes(q) || q.includes(artist))) score = Math.max(score, 0.55);
  else if (album && album.includes(q)) score = Math.max(score, 0.45);

  return score;
}

export function bestMatch(
  query: string,
  library: Track[],
  playCounts: Record<string, number>
): { track: Track; score: number } | null {
  let best: { track: Track; score: number } | null = null;
  const maxCount = Math.max(1, ...Object.values(playCounts));
  for (const track of library) {
    let s = scoreTrack(query, track);
    // command learning: frequently played tracks get a nudge
    s += 0.12 * ((playCounts[track.id] ?? 0) / maxCount);
    if (!best || s > best.score) best = { track, score: s };
  }
  return best && best.score >= 0.42 ? best : null;
}

/** "play similar" — shared artist > genre > album, weighted by listening history */
export function similarTo(
  current: Track,
  library: Track[],
  playCounts: Record<string, number>
): Track | null {
  let best: { track: Track; score: number } | null = null;
  const maxCount = Math.max(1, ...Object.values(playCounts));
  for (const t of library) {
    if (t.id === current.id) continue;
    let s = 0;
    if (t.artist === current.artist) s += 3;
    if (t.album === current.album) s += 2;
    if (t.genre === current.genre) s += 2;
    if (s === 0) continue;
    s += ((playCounts[t.id] ?? 0) / maxCount) * 1.5;
    if (!best || s > best.score) best = { track: t, score: s };
  }
  return best?.track ?? null;
}

/* ---------------- command parsing ---------------- */

export type Command =
  | { type: 'play'; query: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'similar' }
  | { type: 'shuffleOn' }
  | { type: 'shuffleOff' }
  | { type: 'repeat' }
  | { type: 'volumeUp' }
  | { type: 'volumeDown' }
  | { type: 'volumeSet'; value: number }
  | { type: 'whatsPlaying' }
  | { type: 'help' }
  | { type: 'unknown'; raw: string };

const STOP_WORDS = /^(please|kitty|hey|ok|okay|can you|could you|would you)$/;

function clean(text: string): string {
  return normalize(text)
    .split(' ')
    .filter((w) => !STOP_WORDS.test(w))
    .join(' ')
    .trim();
}

export function parseCommand(raw: string): Command {
  const t = clean(raw);
  if (!t) return { type: 'unknown', raw };

  // play [song]
  const playMatch = t.match(/^(?:play|put on|queue|start|listen to)\s+(.+)$/);
  if (playMatch) {
    const q = playMatch[1].trim();
    if (/something similar|similar|like this|more like this/.test(q)) return { type: 'similar' };
    if (/^(that|this|it|again)$/.test(q)) return { type: 'resume' };
    return { type: 'play', query: q };
  }
  if (/^(play|resume|continue|unpause|go on|keep playing)$/.test(t)) return { type: 'resume' };
  if (/(pause|hold on|wait a sec)/.test(t) && t.length < 22) return { type: 'pause' };
  if (/^(stop|shut up|silence|quiet|enough)$/.test(t) || t === 'stop playing') return { type: 'stop' };
  if (/(next|skip|skip this|next song|next track|forward)/.test(t) && t.length < 24) return { type: 'next' };
  if (/(previous|prev|go back|back|last song|last track|rewind)/.test(t) && t.length < 26) return { type: 'previous' };
  if (/(play something similar|similar|more like this|songs like this|like this one)/.test(t)) return { type: 'similar' };

  if (/shuffle (off|disable)|stop shuffling|turn off shuffle/.test(t)) return { type: 'shuffleOff' };
  if (/shuffle|mix it up|random/.test(t) && t.length < 28) return { type: 'shuffleOn' };
  if (/(repeat|loop)/.test(t) && t.length < 28) return { type: 'repeat' };

  const volSet = t.match(/volume (?:to )?(\d{1,3})(?: percent)?/);
  if (volSet) return { type: 'volumeSet', value: Math.min(100, parseInt(volSet[1], 10)) / 100 };
  if (/(volume up|louder|turn it up|more volume|crank it)/.test(t)) return { type: 'volumeUp' };
  if (/(volume down|quieter|turn it down|softer|lower volume|less volume)/.test(t)) return { type: 'volumeDown' };

  if (/(what('| i)?s playing|what song|which song|now playing|what track)/.test(t)) return { type: 'whatsPlaying' };
  if (/(help|what can you do|commands)/.test(t)) return { type: 'help' };

  // bare song name → treat as play
  if (t.split(' ').length <= 5) return { type: 'play', query: t };
  return { type: 'unknown', raw };
}
