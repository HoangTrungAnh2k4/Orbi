// Hiệu ứng cho OrbPlay: pháo hoa trên canvas và tiếng bíp bằng WebAudio (không cần file âm thanh).

type Particle = { x: number; y: number; vx: number; vy: number; life: number; r: number; color: string };

// màu pháo hoa lấy từ token --seg-* của theme để hex chỉ nằm trong globals.css
const themeColors = () => {
  const css = getComputedStyle(document.documentElement);
  return [0, 1, 2, 3, 4, 5].map((i) => css.getPropertyValue(`--seg-${i}`).trim()).filter(Boolean);
};

export function createFireworks(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  let ps: Particle[] = [];
  let raf = 0;
  const resize = () => {
    const d = devicePixelRatio || 1;
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    ctx?.setTransform(d, 0, 0, d, 0, 0);
  };
  resize();
  addEventListener("resize", resize);

  const frame = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = "lighter";
    ps = ps.filter((p) => (p.life -= 0.012) > 0);
    for (const p of ps) {
      p.vx *= 0.975;
      p.vy = p.vy * 0.975 + 0.05; // trọng lực nhẹ, tàn pháo rơi xuống
      p.x += p.vx;
      p.y += p.vy;
      ctx.globalAlpha = Math.min(1, p.life * 1.6);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = ps.length ? requestAnimationFrame(frame) : 0;
  };

  return {
    // nổ một quả tại (x, y) theo toạ độ viewport
    burst(x: number, y: number, count = 90) {
      const colors = themeColors();
      const main = colors[Math.floor(Math.random() * colors.length)] ?? "white";
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 1.5 + Math.random() * 5.5;
        ps.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          life: 0.7 + Math.random() * 0.5, r: 1 + Math.random() * 1.8,
          color: Math.random() < 0.7 ? main : colors[i % colors.length] ?? main,
        });
      }
      if (!raf) raf = requestAnimationFrame(frame);
    },
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    },
  };
}

let ac: AudioContext | null = null;

// Safari chỉ cho chạy AudioContext tạo/resume trong cú click, nên gọi unlock ngay trong handler
const unlock = () => {
  ac ??= new AudioContext();
  if (ac.state === "suspended") void ac.resume();
  return ac;
};

function beep(freq: number, dur: number, type: OscillatorType, vol: number, at = 0) {
  ac = unlock();
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur);
}

export const sfx = {
  unlock,
  tick: () => beep(1500, 0.025, "square", 0.025),
  miss: () => beep(196, 0.22, "sine", 0.1),
  count: (last: boolean) => beep(last ? 1320 : 880, last ? 0.5 : 0.18, "sine", 0.12),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, 0.4, "triangle", 0.09, i * 0.08)),
};
