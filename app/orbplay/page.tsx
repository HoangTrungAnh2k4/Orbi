"use client";
import Link from "next/link";
import { Big_Shoulders, Big_Shoulders_Inline } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { LuBrain, LuDices, LuGift, LuRotateCcw, LuRotateCw, LuShuffle, LuTicket, LuTrash2, LuVolume2, LuVolumeX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { drawIndices, expandPrizes, parseEntries, segmentAt, spinTo } from "./random";
import { createFireworks, sfx } from "./fx";
import { Envelopes, type Envelope } from "./envelopes";
import { MemoryBoard } from "./cards";
import { flip, hideOpen, newMemory, solved, type Memory } from "./memory";

const LEVELS = [{ label: "Dễ", pairs: 6 }, { label: "Vừa", pairs: 8 }, { label: "Khó", pairs: 12 }];
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

const display = Big_Shoulders({ subsets: ["latin", "vietnamese"], variable: "--font-display" });
const marquee = Big_Shoulders_Inline({ subsets: ["latin"], weight: ["800"], variable: "--font-marquee" });
const SAMPLE = "An\nBình\nChi\nDũng\nGiang\nHà";
const PRIZES = "500.000đ\n200.000đ x2\n100.000đ x3\n50.000đ x4\nChúc may mắn lần sau x2";
const SHAKE_MS = 900; // bao rung trước khi mở cho hồi hộp
const SPIN_MS = 6500; // khớp transition .wheel trong globals.css
const COUNT_FROM = 5;
const COUNT_MS = 1000; // mỗi nhịp đếm ngược 5-4-3-2-1, đúng 1 giây như đếm giao thừa
const DENSE = 60; // quá số ô này thì chữ trên vòng chồng lên nhau, ẩn tên, bảng phía trên báo tên đang qua kim
const BULBS = 24;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// toạ độ trên vòng tròn bán kính r, góc tính từ đỉnh theo chiều kim đồng hồ
const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
};
// n % 6 == 1 thì ô cuối trùng màu ô đầu, đổi sang màu khác
const segColor = (i: number, n: number) => (i === n - 1 && n % 6 === 1 ? 2 : i % 6);
const short = (s: string) => (s.length > 14 ? s.slice(0, 13) + "…" : s);

type WheelProps = { entries: string[]; rot: number; spinning: boolean; wheelRef: React.Ref<SVGGElement>; pointerRef: React.Ref<SVGPathElement> };

function Wheel({ entries, rot, spinning, wheelRef, pointerRef }: WheelProps) {
  const n = entries.length;
  const s = 360 / n;
  const size = Math.max(7, Math.min(15, 170 / n));
  const dense = n > DENSE;
  return (
    <svg viewBox="-106 -114 212 220" className={`wheel-svg mx-auto w-full max-w-sm ${dense ? "dense" : ""} ${spinning ? "spinning" : ""}`} role="img" aria-label={`Vòng quay ${n} ô`}>
      <circle r="102" className="rim" />
      <g ref={wheelRef} className="wheel" style={{ "--rot": `${rot}deg` } as React.CSSProperties}>
        {n === 1 ? (
          <circle r="95" className="seg seg-0" />
        ) : (
          entries.map((_, i) => (
            <path key={i} className={`seg seg-${segColor(i, n)}`} d={`M0 0 L${pt(i * s, 95)} A95 95 0 ${s > 180 ? 1 : 0} 1 ${pt((i + 1) * s, 95)}Z`} />
          ))
        )}
        {!dense && entries.map((name, i) => (
          <text key={i} className="seg-label" fontSize={size} transform={`rotate(${i * s + s / 2 - 90}) translate(60 0)`}>
            {short(name)}
          </text>
        ))}
      </g>
      <g>
        {Array.from({ length: BULBS }, (_, i) => {
          const [x, y] = pt((i * 360) / BULBS, 102).split(" ");
          return <circle key={i} cx={x} cy={y} r="2.4" className="bulb" />;
        })}
      </g>
      <circle r="13" className="hub" />
      <path ref={pointerRef} d="M-10 -112 L10 -112 L0 -86 Z" className="pointer" />
    </svg>
  );
}

type BoardState = { big: string; small?: string; mode: "idle" | "rolling" | "count" | "win" };

// bảng đếm ngược: tên đang qua kim, số 3-2-1, rồi người trúng
function Board({ big, small, mode, boardRef }: BoardState & { boardRef: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={boardRef} aria-hidden className="board flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center" data-mode={mode}>
      <span
        key={mode === "count" || mode === "win" ? big : mode}
        className={`line-clamp-1 font-display font-extrabold tracking-tight ${mode === "count" ? "text-7xl" : "text-5xl"} ${mode === "win" || mode === "count" ? "text-primary animate-in zoom-in-50 fade-in duration-300 motion-reduce:animate-none" : mode === "rolling" ? "text-foreground" : "text-muted-foreground"}`}
      >
        {big}
      </span>
      {small && <span className="mt-1 line-clamp-1 text-sm text-muted-foreground">{small}</span>}
    </div>
  );
}

export default function OrbPlay() {
  const [text, setText] = useState(SAMPLE);
  const [removeWinner, setRemoveWinner] = useState(false);
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0);
  const [count, setCount] = useState(1);
  const [board, setBoard] = useState<BoardState>({ big: "Sẵn sàng", mode: "idle" });
  const [winners, setWinners] = useState<string[]>([]);
  const [announce, setAnnounce] = useState(""); // cho trình đọc màn hình, bảng thì aria-hidden vì đổi liên tục
  const [year, setYear] = useState<number | null>(null);
  const [tab, setTab] = useState("wheel");
  const [prizeText, setPrizeText] = useState(PRIZES);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [dealtFrom, setDealtFrom] = useState(""); // prizeText lúc xáo, khác thì báo xáo lại
  const [round, setRound] = useState(0);
  const [level, setLevel] = useState(8);
  const [mem, setMem] = useState<Memory | null>(null); // tạo ở client khi mở tab, random lúc SSR sẽ lệch hydration
  const [startAt, setStartAt] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(0);
  const playing = startAt > 0 && !endAt;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [playing]);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const hideTimer = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fw = useRef<ReturnType<typeof createFireworks> | null>(null);
  const wheelRef = useRef<SVGGElement>(null);
  const pointerRef = useRef<SVGPathElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const entries = parseEntries(text);

  useEffect(() => {
    // tháng 11-12 thì đã đếm tới năm sau; tính ở client để trang build sẵn không bị lệch năm
    const d = new Date();
    setYear(d.getFullYear() + (d.getMonth() >= 10 ? 1 : 0));
    fw.current = canvas.current && createFireworks(canvas.current);
    const t = timers.current;
    const hide = hideTimer;
    return () => { t.forEach(clearTimeout); clearTimeout(hide.current); cancelAnimationFrame(raf.current); fw.current?.destroy(); };
  }, []);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const play = (fn: () => void) => { if (sound) try { fn(); } catch { /* trình duyệt chặn audio thì im lặng */ } };

  // nổ pháo hoa ở phần tử vừa trúng (mặc định là bảng kết quả)
  const celebrate = (el: Element | null = boardRef.current) => {
    play(sfx.win);
    if (reducedMotion() || !fw.current) return;
    const r = el?.getBoundingClientRect();
    fw.current.burst(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 3, 150);
    later(() => fw.current?.burst(innerWidth * 0.18, innerHeight * 0.28), 260);
    later(() => fw.current?.burst(innerWidth * 0.82, innerHeight * 0.22), 480);
    later(() => fw.current?.burst(innerWidth * 0.5, innerHeight * 0.12), 700);
  };

  // bỏ người trúng khỏi danh sách theo index (tên trùng nhau chỉ bỏ đúng người đó)
  const finish = (picked: number[], names: string[]) => {
    if (removeWinner) setText(entries.filter((_, i) => !picked.includes(i)).join("\n"));
    setAnnounce(`Trúng: ${names.join(", ")}`);
    setBusy(false);
  };

  const spin = () => {
    const list = entries;
    const [i] = drawIndices(list.length, 1);
    const name = list[i];
    setBusy(true);
    setWinners([]);
    setAnnounce("");
    setRot((r) => spinTo(r, i, list.length, 9));
    play(sfx.unlock); // tick đầu tiên chạy trong rAF, ngoài cú click
    const end = () => {
      cancelAnimationFrame(raf.current);
      setBoard({ big: name, small: "Chúc mừng năm mới!", mode: "win" });
      setWinners([name]);
      celebrate();
      finish([i], [name]);
    };
    if (reducedMotion()) return end();

    // đọc góc quay thật mỗi frame: ô nào đang dưới kim thì hiện tên, kim giật và kêu tách
    let last = -1;
    let lastFx = 0;
    const loop = (t: number) => {
      const g = wheelRef.current;
      if (g) {
        const m = new DOMMatrix(getComputedStyle(g).transform);
        const idx = segmentAt((Math.atan2(m.b, m.a) * 180) / Math.PI, list.length);
        if (idx !== last) {
          last = idx;
          setBoard({ big: list[idx], mode: "rolling" });
          if (t - lastFx > 45) { // 300 ô thì đổi mỗi frame, giới hạn để khỏi rè
            lastFx = t;
            pointerRef.current?.animate([{ transform: "rotate(-24deg)" }, { transform: "rotate(0deg)" }], { duration: 160, easing: "ease-out" });
            play(sfx.tick);
          }
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    later(end, SPIN_MS + 120);
  };

  const draw = () => {
    const list = entries;
    const picked = drawIndices(list.length, count);
    const names = picked.map((i) => list[i]);
    setBusy(true);
    setWinners([]);
    setAnnounce("");
    const done = () => {
      setBoard({ big: names.length === 1 ? names[0] : `${names.length} người trúng`, small: "Chúc mừng năm mới!", mode: "win" });
      celebrate();
      finish(picked, names);
    };
    if (reducedMotion()) { setWinners(names); return done(); }

    // xáo tên liên tục dưới số đếm ngược, như đếm giờ giao thừa
    const randomName = () => list[Math.floor(Math.random() * list.length)];
    let n = COUNT_FROM;
    const shuffle = window.setInterval(() => setBoard((b) => ({ ...b, small: randomName() })), 60);
    timers.current.push(shuffle);
    const step = () => {
      if (n > 0) {
        setBoard({ big: String(n), small: randomName(), mode: "count" });
        play(() => sfx.count(false));
        n--;
        return later(step, COUNT_MS);
      }
      clearInterval(shuffle);
      play(() => sfx.count(true));
      // lật từng người trúng, danh sách dài thì lật nhanh hơn cho khỏi chờ
      const gap = Math.min(380, 2400 / names.length);
      names.forEach((_, k) => later(() => {
        setWinners(names.slice(0, k + 1));
        setBoard({ big: names[k], small: `${k + 1}/${names.length}`, mode: "win" });
        if (k === names.length - 1) later(done, 300);
      }, k * gap));
    };
    step();
  };

  const prizes = expandPrizes(prizeText);
  const deal = () => {
    setEnvelopes(drawIndices(prizes.length, prizes.length).map((i) => ({ prize: prizes[i], opened: false })));
    setDealtFrom(prizeText);
    setRound((r) => r + 1);
    setAnnounce(`Đã xếp ${prizes.length} bao lì xì`);
  };

  const openEnvelope = (i: number, el: HTMLButtonElement) => {
    setBusy(true);
    const reveal = () => {
      setEnvelopes((list) => list.map((e, k) => (k === i ? { ...e, opened: true } : e)));
      setAnnounce(`Bao số ${i + 1}: ${envelopes[i].prize}`);
      celebrate(el);
      setBusy(false);
    };
    if (reducedMotion()) return reveal();
    el.animate(
      [0, -10, 10, -12, 12, -8, 8, 0].map((deg, k) => ({ transform: `rotate(${deg}deg) scale(${1 + k * 0.02})` })),
      { duration: SHAKE_MS, easing: "ease-in-out" },
    );
    play(sfx.tick);
    later(reveal, SHAKE_MS);
  };
  const newGame = (pairs: number) => {
    clearTimeout(hideTimer.current); // timer úp 2 thẻ sai của ván cũ không được đụng sang ván mới
    setLevel(pairs);
    setMem(newMemory(pairs));
    setStartAt(0);
    setEndAt(0);
    setRound((r) => r + 1);
  };

  const flipCard = (i: number, el: HTMLButtonElement) => {
    if (!mem) return;
    const { m, result } = flip(mem, i);
    if (result === "ignore") return;
    setMem(m);
    if (!startAt) { const t = Date.now(); setStartAt(t); setNow(t); }
    if (result === "first") play(sfx.tick);
    if (result === "miss") {
      play(sfx.miss);
      hideTimer.current = window.setTimeout(() => setMem((x) => x && hideOpen(x)), 1000); // cho người chơi kịp nhớ 2 thẻ sai
    }
    if (result === "match" && !solved(m)) play(() => sfx.count(true));
    if (result === "match" && solved(m)) {
      const t = Date.now();
      setEndAt(t);
      setAnnounce(`Ghép xong ${m.cards.length / 2} cặp sau ${m.moves} lượt, ${clock(t - (startAt || t))}`);
      celebrate(el.closest("ol"));
    }
  };
  const elapsed = startAt ? (endAt || now) - startAt : 0;
  const pairsDone = mem ? mem.cards.filter((c) => c.matched).length / 2 : 0;

  const left = envelopes.filter((e) => !e.opened).length;
  const stale = envelopes.length > 0 && dealtFrom !== prizeText;

  const maxCount = Math.max(1, entries.length);
  const tooFew = entries.length < 2;
  const hint = tooFew ? "Cần ít nhất 2 mục" : "Sẵn sàng";
  const idle: BoardState = { big: hint, mode: "idle" };
  const shown = busy || board.mode === "win" ? board : idle;

  return (
    <main data-tool="orbplay" data-dark className={`${display.variable} ${marquee.variable} mx-auto min-h-dvh max-w-5xl px-4 pt-8 pb-16`}>
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />
      <header className="flex items-center gap-4">
        <Link href="/orbplay" className="font-display text-3xl font-extrabold tracking-tight">
          Orb<span className="text-primary">Play</span>
        </Link>
        <Link href="/" className="ml-auto text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground">← Orbi</Link>
      </header>

      <section className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p aria-hidden className="font-marquee text-year text-primary">{year ?? " "}</p>
        <div className="max-w-sm pb-2">
          <h1 className="font-display text-3xl font-bold leading-tight">Ai may mắn nhất đêm giao thừa?</h1>
          <p className="mt-1 text-muted-foreground">Dán danh sách vào, quay vòng hoặc bốc thăm cho tiệc tất niên.</p>
        </div>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {tab === "memory" ? (
          <section className="rounded-xl border bg-card p-4" aria-labelledby="mem-title">
            <h2 id="mem-title" className="font-display text-2xl font-bold">Lật thẻ ký ức</h2>
            <p className="mt-1 text-sm text-muted-foreground">Mỗi lượt lật 2 thẻ. Giống nhau thì giữ lại, ghép hết các cặp là thắng.</p>
            <div role="group" aria-label="Độ khó" className="mt-4 grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <Button key={l.pairs} variant={level === l.pairs ? "default" : "outline"} aria-pressed={level === l.pairs} onClick={() => newGame(l.pairs)} className="h-auto flex-col py-2">
                  <span className="font-display text-lg font-bold">{l.label}</span>
                  <span className="text-xs opacity-80">{l.pairs} cặp</span>
                </Button>
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[["Lượt", mem?.moves ?? 0], ["Thời gian", clock(elapsed)], ["Đã ghép", `${pairsDone}/${level}`]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-background px-2 py-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-display text-3xl font-bold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Button variant="outline" className="mt-4 w-full" onClick={() => newGame(level)}>
              <LuRotateCcw aria-hidden /> Chơi lại
            </Button>
          </section>
        ) : tab === "lixi" ? (
          <section className="rounded-xl border bg-card p-4" aria-labelledby="prize-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="prize-title" className="font-display text-2xl font-bold">Quà trong bao</h2>
              <span className="text-sm text-muted-foreground">{prizes.length} bao</span>
            </div>
            <label htmlFor="prizes" className="mt-1 block text-sm text-muted-foreground">Mỗi dòng một phần quà, thêm “x3” ở cuối để nhét 3 bao giống nhau</label>
            <textarea
              id="prizes"
              value={prizeText}
              onChange={(e) => setPrizeText(e.target.value)}
              disabled={busy}
              rows={10}
              className="mt-3 w-full resize-y rounded-lg border bg-background p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
            />
          </section>
        ) : (
        <section className="rounded-xl border bg-card p-4" aria-labelledby="list-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="list-title" className="font-display text-2xl font-bold">Danh sách</h2>
            <span className="text-sm text-muted-foreground">{entries.length} mục</span>
          </div>
          <label htmlFor="entries" className="mt-1 block text-sm text-muted-foreground">Mỗi dòng một tên hoặc một phần thưởng</label>
          <textarea
            id="entries"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            rows={10}
            className="mt-3 w-full resize-y rounded-lg border bg-background p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={removeWinner} onChange={(e) => setRemoveWinner(e.target.checked)} disabled={busy} className="size-4 accent-primary disabled:opacity-60" />
              Loại người đã trúng
            </label>
            <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={busy || !text}>
              <LuTrash2 aria-hidden /> Xóa hết
            </Button>
          </div>
        </section>
        )}

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setBoard(idle); if (v === "memory" && !mem) newGame(level); }} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <TabsList className="flex-1 max-sm:[&_svg]:hidden">
              <TabsTrigger value="wheel" disabled={busy}><LuRotateCw aria-hidden /> Vòng quay</TabsTrigger>
              <TabsTrigger value="draw" disabled={busy}><LuTicket aria-hidden /> Bốc thăm</TabsTrigger>
              <TabsTrigger value="lixi" disabled={busy}><LuGift aria-hidden /> Lì xì</TabsTrigger>
              <TabsTrigger value="memory" disabled={busy}><LuBrain aria-hidden /> Lật thẻ</TabsTrigger>
            </TabsList>
            <Button variant="ghost" size="icon" aria-pressed={sound} aria-label={sound ? "Tắt âm thanh" : "Bật âm thanh"} onClick={() => setSound((v) => !v)}>
              {sound ? <LuVolume2 aria-hidden /> : <LuVolumeX aria-hidden />}
            </Button>
          </div>

          <TabsContent value="wheel" className="mt-4 flex flex-col items-center gap-4">
            <Board {...shown} boardRef={boardRef} />
            {entries.length ? <Wheel entries={entries} rot={rot} spinning={busy} wheelRef={wheelRef} pointerRef={pointerRef} /> : <Empty />}
            <Button size="lg" className="h-11 px-8 font-display text-xl font-bold" onClick={spin} disabled={busy || tooFew}>
              <LuRotateCw aria-hidden /> {busy ? "Đang quay…" : "Quay"}
            </Button>
          </TabsContent>

          <TabsContent value="draw" className="mt-4 flex flex-col items-center gap-4">
            <Board {...shown} boardRef={boardRef} />
            <div className="flex flex-wrap items-end justify-center gap-3">
              <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                Số người trúng
                <input
                  type="number"
                  min={1}
                  max={maxCount}
                  value={Math.min(count, maxCount)}
                  onChange={(e) => setCount(Math.max(1, Math.min(maxCount, Math.floor(Number(e.target.value)) || 1)))}
                  disabled={busy}
                  className="h-11 w-24 rounded-lg border bg-background px-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>
              <Button size="lg" className="h-11 px-8 font-display text-xl font-bold" onClick={draw} disabled={busy || tooFew}>
                <LuDices aria-hidden /> {busy ? "Đang bốc…" : "Bốc thăm"}
              </Button>
            </div>
            {winners.length > 0 && (
              <ol className="flex max-h-64 w-full flex-wrap justify-center gap-2 overflow-y-auto">
                {winners.map((n, i) => (
                  <li key={i} className="animate-in zoom-in-50 fade-in rounded-full bg-primary px-4 py-1 font-display text-xl font-bold text-primary-foreground duration-300 motion-reduce:animate-none">{n}</li>
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="lixi" className="mt-4 flex flex-col items-center gap-4">
            {envelopes.length > 0 && (
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground">
                  {left ? <>Còn <span className="font-display text-xl font-bold text-foreground">{left}</span> bao, chọn một bao để mở</> : "Đã mở hết bao"}
                </p>
                <Button variant="outline" onClick={deal} disabled={busy || !prizes.length}>
                  <LuShuffle aria-hidden /> Xáo bao mới
                </Button>
              </div>
            )}
            {stale && <p role="status" className="w-full text-sm text-primary">Danh sách quà đã đổi, bấm Xáo bao mới để nhét lại.</p>}
            {envelopes.length ? (
              <Envelopes items={envelopes} round={round} disabled={busy} onOpen={openEnvelope} />
            ) : (
              <div className="flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center">
                <p className="text-muted-foreground">{prizes.length ? `${prizes.length} phần quà sẵn sàng để nhét vào bao.` : "Thêm phần quà ở danh sách bên cạnh."}</p>
                <Button size="lg" className="h-11 px-8 font-display text-xl font-bold" onClick={deal} disabled={!prizes.length}>
                  <LuGift aria-hidden /> Xếp bao lì xì
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="memory" className="mt-4 flex flex-col items-center gap-4">
            <p className={`w-full text-center ${endAt ? "animate-in zoom-in-75 fade-in font-display text-3xl font-bold text-primary motion-reduce:animate-none" : "text-muted-foreground"}`}>
              {endAt && mem ? `Xong! ${mem.moves} lượt trong ${clock(elapsed)}` : startAt ? "Nhớ kỹ vị trí từng thẻ nhé" : "Lật một thẻ bất kỳ để bắt đầu tính giờ"}
            </p>
            {mem && <MemoryBoard game={mem} round={round} onFlip={flipCard} />}
          </TabsContent>
        </Tabs>
      </div>
      <p aria-live="polite" className="sr-only">{announce}</p>
    </main>
  );
}

const Empty = () => (
  <p className="flex aspect-square w-full max-w-sm items-center justify-center rounded-full border-2 border-dashed text-center text-muted-foreground">
    Danh sách đang trống
  </p>
);
