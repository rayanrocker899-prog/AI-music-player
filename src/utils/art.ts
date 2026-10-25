import { hashString, mulberry32 } from './misc';
import type { Track } from '../data/tracks';

const cache = new Map<string, string>();

/**
 * Procedural album art — seeded gradients, orbital blobs and
 * light streaks rendered on canvas, cached per track.
 */
export function getArt(track: Track, size = 512): string {
  const key = `${track.id}:${size}`;
  if (cache.has(key)) return cache.get(key)!;

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const rnd = mulberry32(hashString(track.id) + track.seed);
  const h = track.hue;

  // base vertical gradient
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, `hsl(${h} 62% ${10 + rnd() * 6}%)`);
  bg.addColorStop(1, `hsl(${(h + 40) % 360} 55% ${18 + rnd() * 8}%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // radial glow
  const gx = size * (0.25 + rnd() * 0.5), gy = size * (0.2 + rnd() * 0.4);
  const rad = ctx.createRadialGradient(gx, gy, 0, gx, gy, size * 0.9);
  rad.addColorStop(0, `hsla(${h} 90% 65% / 0.55)`);
  rad.addColorStop(1, 'transparent');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // orbital blobs
  const blobs = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < blobs; i++) {
    const bx = rnd() * size, by = rnd() * size, r = size * (0.12 + rnd() * 0.3);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    const bh = (h + 120 + rnd() * 120) % 360;
    g.addColorStop(0, `hsla(${bh} 85% ${60 + rnd() * 15}% / ${0.25 + rnd() * 0.3})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // concentric rings
  ctx.globalCompositeOperation = 'overlay';
  const cx = size / 2, cy = size / 2;
  for (let i = 1; i <= 6; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (size / 7) * i + rnd() * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${(h + i * 22) % 360} 80% 70% / ${0.12 - i * 0.012})`;
    ctx.lineWidth = size * 0.008;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // scanline streaks
  const streaks = 5 + Math.floor(rnd() * 5);
  for (let i = 0; i < streaks; i++) {
    const y = rnd() * size;
    const lg = ctx.createLinearGradient(0, y, size, y + size * 0.06);
    lg.addColorStop(0, 'transparent');
    lg.addColorStop(0.5, `hsla(${(h + 60) % 360} 95% 75% / ${0.05 + rnd() * 0.08})`);
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.fillRect(0, y, size, size * 0.02);
  }

  // vignette
  const vg = ctx.createRadialGradient(cx, cy, size * 0.35, cx, cy, size * 0.75);
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, size, size);

  // monogram
  ctx.font = `700 ${size * 0.34}px "Outfit", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'hsla(0 0% 100% / 0.16)';
  ctx.fillText(track.title.charAt(0).toUpperCase(), cx, cy + size * 0.02);

  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
