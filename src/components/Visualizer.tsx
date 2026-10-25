import { useEffect, useRef } from 'react';
import { player } from '../audio/player';
import { useStore } from '../store';

/**
 * Audio-reactive bars — rendered on canvas behind the album art.
 * Battery saver renders a calm static state with no RAF loop.
 */
export function Visualizer({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const isPlaying = useStore((s) => s.isPlaying);
  const theme = useStore((s) => s.theme);
  const saver = useStore((s) => s.settings.batterySaver);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const BARS = saver ? 18 : 30;

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();

    const accent = theme === 'dark' ? '#22d3ee' : '#6c7bff';
    const accent2 = theme === 'dark' ? '#a78bfa' : '#a17bff';

    const draw = (data: Uint8Array | null) => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      const bw = w / BARS;
      const cy = h / 2;
      for (let i = 0; i < BARS; i++) {
        let v: number;
        if (data) {
          const idx = Math.floor((i / BARS) * data.length * 0.72);
          v = data[idx] / 255;
        } else {
          v = 0.1 + 0.08 * Math.sin(i * 0.6);
        }
        const bh = Math.max(h * 0.03, v * h * 0.46);
        const grad = ctx.createLinearGradient(0, cy - bh, 0, cy + bh);
        grad.addColorStop(0, accent2);
        grad.addColorStop(0.5, accent);
        grad.addColorStop(1, accent2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = data ? 0.34 + v * 0.4 : 0.22;
        const x = i * bw + bw * 0.22;
        const ww = bw * 0.56;
        ctx.beginPath();
        ctx.roundRect(x, cy - bh, ww, bh * 2, ww / 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (saver || !isPlaying) {
      draw(null);
      return;
    }

    const analyser = player.analyser;
    if (!analyser) { draw(null); return; }
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      draw(data);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, theme, saver]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
