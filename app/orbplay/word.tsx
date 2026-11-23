"use client";
import { useEffect, useRef, useState } from "react";
import { LuCheck, LuLightbulb, LuPlay, LuRotateCcw, LuSkipForward, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { drawIndices } from "./random";
import { normalize, scramble, type WordItem } from "./scramble";
import { sfx } from "./fx";

const ROUNDS = 5;
const ROUND_MS = 30_000;
const URGENT_S = 10; // còn chừng này giây thì thanh giờ chuyển màu và kêu tích tắc ở 5s cuối

type Round = { item: WordItem; letters: string[] };
type Phase = "idle" | "play" | "right" | "wrong" | "done";
type Props = {
  words: WordItem[];
  onPlaying: (on: boolean) => void; // page khóa tab khi đang chơi, đổi tab sẽ mất ván
  play: (fn: () => void) => void;
  celebrate: (el: Element | null) => void;
  announce: (msg: string) => void;
};

export function WordGame({ words, onPlaying, play, celebrate, announce }: Props) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [guess, setGuess] = useState("");
  const [results, setResults] = useState<{ ok: boolean; pts: number }[]>([]);
  const [skipped, setSkipped] = useState(false);
  const resultsRef = useRef<{ ok: boolean; pts: number }[]>([]);
  const tick = useRef(0);
  const timers = useRef<number[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const board = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = timers.current;
    return () => { clearInterval(tick.current); t.forEach(clearTimeout); };
  }, []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const inGame = phase !== "idle" && phase !== "done";
  useEffect(() => {
    onPlaying(inGame);
    return () => onPlaying(false);
  }, [inGame, onPlaying]);

  // rs, i truyền tay thay vì đọc state để timer của vòng cũ không đọc nhầm vòng mới
  const begin = (rs: Round[], i: number) => {
    const end = Date.now() + ROUND_MS;
    setIdx(i);
    setGuess("");
    setPhase("play");
    setDeadline(end);
    setNow(Date.now());
    let lastSec = -1;
    clearInterval(tick.current);
    tick.current = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const sec = Math.ceil((end - t) / 1000);
      if (sec !== lastSec && sec <= 5 && sec > 0) play(sfx.tick);
      lastSec = sec;
      if (t >= end) finish(rs, i, false, 0);
    }, 200);
    requestAnimationFrame(() => input.current?.focus());
  };

  const finish = (rs: Round[], i: number, ok: boolean, pts: number, skip = false) => {
    clearInterval(tick.current);
    setPhase(ok ? "right" : "wrong");
    setSkipped(skip);
    const all = [...resultsRef.current, { ok, pts }]; // ref vì timer hết giờ chạy với closure cũ
    resultsRef.current = all;
    setResults(all);
    announce(ok ? `Đúng, cộng ${pts} điểm` : `${skip ? "Đã bỏ qua" : "Hết giờ"}, đáp án là ${rs[i].item.word}`);
    if (ok) play(() => sfx.count(true));
    else play(sfx.miss);
    const wait = ok ? 1200 : 2200; // sai thì để lâu hơn cho kịp đọc đáp án
    if (i + 1 < rs.length) return later(() => begin(rs, i + 1), wait);
    later(() => {
      setPhase("done");
      announce(`Xong! Đúng ${all.filter((x) => x.ok).length}/${rs.length} từ, ${all.reduce((s, x) => s + x.pts, 0)} điểm`);
      celebrate(board.current);
    }, wait);
  };

  const start = () => {
    play(sfx.unlock);
    const rs = drawIndices(words.length, Math.min(ROUNDS, words.length)).map((k) => ({ item: words[k], letters: scramble(words[k].word) }));
    setRounds(rs);
    resultsRef.current = [];
    setResults([]);
    begin(rs, 0);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== "play" || !guess.trim()) return;
    if (normalize(guess) === normalize(rounds[idx].item.word)) {
      finish(rounds, idx, true, 10 + secLeft); // trả lời càng nhanh càng nhiều điểm
    } else {
      play(sfx.miss);
      input.current?.animate([0, -8, 8, -6, 6, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 350 });
      input.current?.select();
    }
  };

  const secLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const score = results.reduce((s, x) => s + x.pts, 0);
  const cur = rounds[idx];

  if (phase === "idle" || phase === "done") {
    const done = phase === "done";
    return (
      <div ref={board} className="flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-6 text-center">
        {done ? (
          <>
            <p className="animate-in zoom-in-75 fade-in font-display text-4xl font-bold text-primary motion-reduce:animate-none">{score} điểm</p>
            <ol className="flex w-full max-w-sm flex-col gap-1 text-left">
              {rounds.map((r, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                  {results[i]?.ok ? <LuCheck aria-label="Đúng" className="text-primary" /> : <LuX aria-label="Sai" className="text-destructive" />}
                  <span className="font-display text-lg font-bold tracking-wide">{r.item.word.toUpperCase()}</span>
                  <span className="ml-auto text-sm text-muted-foreground">+{results[i]?.pts ?? 0}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="max-w-sm text-muted-foreground">
            {words.length >= 2 ? `${Math.min(ROUNDS, words.length)} vòng, mỗi vòng 30 giây. Gõ lại từ gốc từ các chữ bị xáo, trả lời càng nhanh càng nhiều điểm.` : "Cần ít nhất 2 từ khóa trong bộ từ bên cạnh."}
          </p>
        )}
        <Button size="lg" className="h-11 px-8 font-display text-xl font-bold" onClick={start} disabled={words.length < 2}>
          {done ? <LuRotateCcw aria-hidden /> : <LuPlay aria-hidden />} {done ? "Chơi lại" : "Bắt đầu"}
        </Button>
      </div>
    );
  }

  const urgent = phase === "play" && secLeft <= URGENT_S;
  const shown = phase === "play" ? cur.letters : [...cur.item.word.toUpperCase().replace(/\s+/g, "")];
  return (
    <div ref={board} className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Vòng <b className="font-display text-lg text-foreground">{idx + 1}/{rounds.length}</b></span>
        <span><b className="font-display text-lg text-primary">{score}</b> điểm</span>
        <span className={urgent ? "font-bold text-destructive" : ""} aria-live="off">Còn <b className="font-display text-lg tabular-nums">{secLeft}s</b></span>
      </div>
      <div className="timebar" data-urgent={urgent || undefined} style={{ "--left": phase === "play" ? (deadline - now) / ROUND_MS : 0 } as React.CSSProperties} aria-hidden />

      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-background px-3 py-6">
        <p className="text-sm text-muted-foreground">{cur.letters.length} chữ cái bị xáo trộn</p>
        <ol key={idx} aria-label={`${phase === "play" ? "Các chữ" : "Đáp án"}: ${shown.join(" ")}`} className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {shown.map((ch, i) => (
            <li key={`${phase}-${i}`} className="tile envelope-deal" data-state={phase} style={{ "--i": i } as React.CSSProperties}>{ch}</li>
          ))}
        </ol>
        {cur.item.hint && (
          <p className="flex items-start gap-2 text-center text-muted-foreground"><LuLightbulb aria-hidden className="mt-1 shrink-0 text-primary" /> {cur.item.hint}</p>
        )}
        {phase === "right" && <p className="animate-in zoom-in-75 font-display text-2xl font-bold text-primary motion-reduce:animate-none">Chính xác! +{results.at(-1)?.pts}</p>}
        {phase === "wrong" && <p className="font-display text-2xl font-bold text-destructive">{skipped ? "Đã bỏ qua" : "Hết giờ"}, đáp án là {cur.item.word.toUpperCase()}</p>}
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          ref={input}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={phase !== "play"}
          aria-label="Nhập từ khóa"
          placeholder="Gõ từ khóa…"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-11 w-full min-w-0 rounded-lg sm:w-auto sm:flex-1 border bg-background px-3 font-display text-xl font-bold tracking-wider uppercase outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:normal-case focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        />
        <Button type="submit" size="lg" className="h-11 flex-1 px-5 sm:flex-none" disabled={phase !== "play" || !guess.trim()}>
          <LuCheck aria-hidden /> Kiểm tra
        </Button>
        <Button type="button" variant="ghost" size="lg" className="h-11" onClick={() => finish(rounds, idx, false, 0, true)} disabled={phase !== "play"}>
          <LuSkipForward aria-hidden /> Bỏ qua
        </Button>
      </form>
    </div>
  );
}
