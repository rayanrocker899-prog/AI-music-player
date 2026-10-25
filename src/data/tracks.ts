export type Mood = 'energetic' | 'chill' | 'dark' | 'bright' | 'synth';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number; // seconds
  hue: number; // album-art base hue
  seed: number;
  bpm: number;
  mood: Mood;
  source: 'builtin' | 'local';
  fileUrl?: string;
  fileName?: string;
}

export const BUILTIN_TRACKS: Track[] = [
  { id: 'believer', title: 'Believer', artist: 'Imagine Dragons', album: 'Evolve', genre: 'Rock', duration: 204, hue: 262, seed: 101, bpm: 125, mood: 'energetic', source: 'builtin' },
  { id: 'thunder', title: 'Thunder', artist: 'Imagine Dragons', album: 'Evolve', genre: 'Rock', duration: 187, hue: 288, seed: 102, bpm: 118, mood: 'energetic', source: 'builtin' },
  { id: 'bones', title: 'Bones', artist: 'Imagine Dragons', album: 'Mercury', genre: 'Rock', duration: 165, hue: 250, seed: 103, bpm: 122, mood: 'dark', source: 'builtin' },
  { id: 'shapeofyou', title: 'Shape of You', artist: 'Ed Sheeran', album: 'Divide', genre: 'Pop', duration: 263, hue: 152, seed: 104, bpm: 96, mood: 'bright', source: 'builtin' },
  { id: 'photograph', title: 'Photograph', artist: 'Ed Sheeran', album: 'Multiply', genre: 'Pop', duration: 258, hue: 36, seed: 105, bpm: 92, mood: 'chill', source: 'builtin' },
  { id: 'blindinglights', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', genre: 'Synthwave', duration: 200, hue: 338, seed: 106, bpm: 128, mood: 'synth', source: 'builtin' },
  { id: 'starboy', title: 'Starboy', artist: 'The Weeknd', album: 'Starboy', genre: 'Synthwave', duration: 230, hue: 198, seed: 107, bpm: 112, mood: 'dark', source: 'builtin' },
  { id: 'thehills', title: 'The Hills', artist: 'The Weeknd', album: 'Beauty Behind', genre: 'R&B', duration: 242, hue: 320, seed: 108, bpm: 100, mood: 'dark', source: 'builtin' },
  { id: 'levitating', title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', genre: 'Pop', duration: 203, hue: 300, seed: 109, bpm: 103, mood: 'bright', source: 'builtin' },
  { id: 'houdini', title: 'Houdini', artist: 'Dua Lipa', album: 'Radical Optimism', genre: 'Pop', duration: 186, hue: 180, seed: 110, bpm: 110, mood: 'bright', source: 'builtin' },
  { id: 'badguy', title: 'Bad Guy', artist: 'Billie Eilish', album: 'When We All Fall Asleep', genre: 'Pop', duration: 194, hue: 94, seed: 111, bpm: 105, mood: 'dark', source: 'builtin' },
  { id: 'oceaneyes', title: 'Ocean Eyes', artist: 'Billie Eilish', album: 'Dont Smile at Me', genre: 'Ambient', duration: 200, hue: 205, seed: 112, bpm: 83, mood: 'chill', source: 'builtin' },
  { id: 'sunflower', title: 'Sunflower', artist: 'Post Malone', album: 'Spider-Verse', genre: 'Hip-Hop', duration: 158, hue: 48, seed: 113, bpm: 90, mood: 'chill', source: 'builtin' },
  { id: 'circles', title: 'Circles', artist: 'Post Malone', album: 'Hollywoods Bleeding', genre: 'Hip-Hop', duration: 215, hue: 24, seed: 114, bpm: 96, mood: 'chill', source: 'builtin' },
  { id: 'midnightrain', title: 'Midnight Rain', artist: 'Taylor Swift', album: 'Midnights', genre: 'Pop', duration: 174, hue: 226, seed: 115, bpm: 108, mood: 'synth', source: 'builtin' },
  { id: 'goldenhour', title: 'Golden Hour', artist: 'JVKE', album: 'Golden Hour', genre: 'Lo-Fi', duration: 209, hue: 42, seed: 116, bpm: 88, mood: 'chill', source: 'builtin' },
  { id: 'countingstars', title: 'Counting Stars', artist: 'OneRepublic', album: 'Native', genre: 'Pop Rock', duration: 257, hue: 16, seed: 117, bpm: 122, mood: 'energetic', source: 'builtin' },
  { id: 'vivalavida', title: 'Viva la Vida', artist: 'Coldplay', album: 'Viva la Vida', genre: 'Rock', duration: 242, hue: 356, seed: 118, bpm: 118, mood: 'energetic', source: 'builtin' },
  { id: 'gravity', title: 'Gravity', artist: 'John Mayer', album: 'Continuum', genre: 'Blues', duration: 289, hue: 172, seed: 119, bpm: 72, mood: 'chill', source: 'builtin' },
  { id: 'neonhorizon', title: 'Neon Horizon', artist: 'Nightdrive', album: 'Midnight City', genre: 'Synthwave', duration: 228, hue: 190, seed: 120, bpm: 118, mood: 'synth', source: 'builtin' },
  { id: 'aurora', title: 'Aurora', artist: 'Nightdrive', album: 'Midnight City', genre: 'Synthwave', duration: 214, hue: 150, seed: 121, bpm: 124, mood: 'synth', source: 'builtin' },
  { id: 'paperplanes', title: 'Paper Planes', artist: 'M.I.A.', album: 'Kala', genre: 'Hip-Hop', duration: 204, hue: 66, seed: 122, bpm: 98, mood: 'bright', source: 'builtin' },
];

export const GENRE_COLOR: Record<string, string> = {
  Rock: '#a78bfa', Pop: '#f472b6', Synthwave: '#22d3ee', 'R&B': '#f0abfc',
  'Hip-Hop': '#fbbf24', 'Lo-Fi': '#34d399', Ambient: '#93c5fd', Blues: '#60a5fa',
  'Pop Rock': '#fb923c', Local: '#e879f9',
};
