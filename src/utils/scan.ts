import { hashString } from './misc';
import type { Track } from '../data/tracks';

const AUDIO_EXT = /\.(mp3|flac|m4a|wav|ogg|aac|opus)$/i;
const GENRES = ['Pop', 'Rock', 'Lo-Fi', 'Electronic', 'Acoustic'];

function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    const done = (d: number) => resolve(isFinite(d) && d > 0 ? d : 180);
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(180);
    setTimeout(() => done(180), 4000);
    a.src = url;
  });
}

/**
 * Turns picked device files into library tracks.
 * Metadata is derived from "Artist - Title" filenames and embedded duration.
 */
export async function scanFiles(files: FileList | File[]): Promise<Track[]> {
  const list = Array.from(files).filter((f) => AUDIO_EXT.test(f.name) || f.type.startsWith('audio/'));
  const out: Track[] = [];
  for (const f of list.slice(0, 200)) {
    const url = URL.createObjectURL(f);
    const duration = await probeDuration(url);
    const base = f.name.replace(AUDIO_EXT, '').replace(/[-_]+/g, ' ').trim();
    const dash = f.name.replace(AUDIO_EXT, '').split(/\s+-\s+/);
    const hasArtist = dash.length >= 2 && dash[0].length < 40;
    const title = (hasArtist ? dash[1] : base) || 'Unknown title';
    const seed = hashString(f.name);
    const hue = seed % 360;
    out.push({
      id: `local-${hashString(f.name + f.size)}`,
      title: title.replace(/\s+/g, ' ').trim(),
      artist: hasArtist ? dash[0].trim() : 'On this device',
      album: 'Local files',
      genre: GENRES[seed % GENRES.length],
      duration: Math.round(duration),
      hue,
      seed,
      bpm: 100,
      mood: 'chill',
      source: 'local',
      fileUrl: url,
      fileName: f.name,
    });
  }
  return out;
}
