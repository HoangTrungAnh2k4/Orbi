"use client";
import { useEffect, useRef, useState } from "react";
import { LuCheck, LuPlay, LuRotateCcw, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { drawIndices } from "./random";
import { makeQuestion, points, type EmojiItem, type EmojiQuestion } from "./emoji";
import { sfx } from "./fx";

const URGENT_S = 5;

// tách theo grapheme để emoji ghép (👨‍👩‍👧, 🎖️) không bị cắt đôi, bỏ khoảng trắng admin gõ xen
const graphemes = (s: string) => [...new Intl.Segmenter().segment(s)].map((x) => x.segment).filter((x) => x.trim());

type Phase = "idle" | "play" | "right" | "wrong" | "done";
type Result = { ok: boolean; pts: number };
type Props = {
  items: EmojiItem[];
  rounds: number;
  seconds: number; // mỗi câu
  onPlaying: (on: boolean) => void; // page khóa tab khi đang chơi, đổi tab sẽ mất ván
  play: (fn: () => void) => void;
  celebrate: (el: Element | null) => void;
  announce: (msg: string) => void;
};

export function EmojiGame({ items, rounds: maxRounds, seconds, onPlaying, play, celebrate, announce }: Props) {
  const roundMs = seconds * 1000;
  const [qs, setQs] = useState<EmojiQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [results, setResults] = useState<Result[]>([]);
  const [feedback, setFeedback] = useState("");
  const resultsRef = useRef<Result[]>([]); // ref vì timer hết giờ chạy với closure cũ
  const streak = useRef(0);
  const tick = useRef(0);
  const timers = useRef<number[]>([]);
  const board = useRef<HTMLDivElement>(null);
  const question = useRef<HTMLDivElement>(null);

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

  // list, i truyền tay thay vì đọc state để timer của câu cũ không đọc nhầm câu mới
  const begin = (list: EmojiQuestion[], i: number) => {
    const end = Date.now() + roundMs;
    setIdx(i);
    setPicked(-1);
    setFeedback("");
    setPhase("play");
    setDeadline(end);
    setNow(Date.now());
    let lastSec = -1;
    clearInterval(tick.current);
    tick.current = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const sec = Math.ceil((end - t) / 1000);
      if (sec !== lastSec && sec <= 3 && sec > 0) play(sfx.tick);
      lastSec = sec;
      if (t >= end) finish(list, i, -1, 0);
    }, 200);
    // focus khung câu hỏi chứ không focus đáp án đầu, kẻo vòng focus trông như đã chọn sẵn
    requestAnimationFrame(() => question.current?.focus({ preventScroll: true }));
  };

  const finish = (list: EmojiQuestion[], i: number, choice: number, leftMs: number) => {
    clearInterval(tick.current);
    const q = list[i];
    const ok = choice === q.answer;
    streak.current = ok ? streak.current + 1 : 0;
    const p = points(leftMs, roundMs, streak.current);
    const pts = ok ? p.base + p.speed + p.streak : 0;
    const all = [...resultsRef.current, { ok, pts }];
    resultsRef.current = all;
    setResults(all);
    setPicked(choice);
    setPhase(ok ? "right" : "wrong");
    const used = ((roundMs - leftMs) / 1000).toFixed(1);
    const msg = ok
      ? `Chính xác (${used}s)! +${pts} điểm (Chuẩn ${p.base} + Tốc độ ${p.speed}${p.streak ? ` + Chuỗi ${p.streak}` : ""})`
      : `${choice < 0 ? "Hết giờ" : "Sai rồi"}, đáp án là “${q.options[q.answer]}”`;
    setFeedback(msg);
    announce(msg);
    play(ok ? () => sfx.count(true) : sfx.miss);
    const wait = ok ? 1500 : 2500; // sai thì để lâu hơn cho kịp đọc đáp án
    if (i + 1 < list.length) return later(() => begin(list, i + 1), wait);
    later(() => {
      setPhase("done");
      announce(`Xong! Đúng ${all.filter((x) => x.ok).length}/${list.length} câu, ${all.reduce((s, x) => s + x.pts, 0)} điểm`);
      celebrate(board.current);
    }, wait);
  };

  const start = () => {
    play(sfx.unlock);
    const list = drawIndices(items.length, Math.min(maxRounds, items.length)).map((k) => makeQuestion(items, k));
    setQs(list);
    resultsRef.current = [];
    setResults([]);
    streak.current = 0;
    begin(list, 0);
  };

  const choose = (k: number) => {
    if (phase !== "play") return;
    const left = deadline - Date.now();
    if (left <= 0) return; // interval tới 200ms mới chốt hết giờ
    finish(qs, idx, k, left);
  };

  // đáp án trùng nhau (khác hoa thường) chỉ tính một, dưới 2 đáp án thì câu nào cũng chỉ có 1 nút
  const playable = new Set(items.map((x) => x.answer.toLowerCase())).size >= 2;
  const score = results.reduce((s, x) => s + x.pts, 0);
  const secLeft = Math.max(0, Math.ceil((deadline - now) / 1000));

  if (phase === "idle" || phase === "done") {
    const done = phase === "done";
    return (
      <div ref={board} className="flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-6 text-center">
        {done ? (
          <>
            <p className="animate-in zoom-in-75 fade-in font-display text-4xl font-bold text-primary motion-reduce:animate-none">{score} điểm</p>
            <p className="text-muted-foreground">Đúng {results.filter((r) => r.ok).length}/{qs.length} câu</p>
            <ol className="flex w-full max-w-sm flex-col gap-1 text-left">
              {qs.map((q, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                  {results[i]?.ok ? <LuCheck aria-label="Đúng" className="shrink-0 text-primary" /> : <LuX aria-label="Sai" className="shrink-0 text-destructive" />}
                  <span aria-hidden className="shrink-0">{q.emoji}</span>
                  <span className="min-w-0 truncate">{q.options[q.answer]}</span>
                  <span className="ml-auto shrink-0 text-sm text-muted-foreground">+{results[i]?.pts ?? 0}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="max-w-sm text-muted-foreground">
            {playable
              ? `${Math.min(maxRounds, items.length)} câu, mỗi câu ${seconds} giây. Nhìn chuỗi emoji, chọn đúng ý nghĩa. Trả lời nhanh và đúng liên tiếp được cộng thêm điểm.`
              : "Cần ít nhất 2 câu đố có đáp án khác nhau trong bộ emoji bên cạnh."}
          </p>
        )}
        <Button size="lg" className="h-11 px-8 font-display text-xl font-bold" onClick={start} disabled={!playable}>
          {done ? <LuRotateCcw aria-hidden /> : <LuPlay aria-hidden />} {done ? "Chơi lại" : "Bắt đầu"}
        </Button>
      </div>
    );
  }

  const q = qs[idx];
  const urgent = phase === "play" && secLeft <= Math.min(URGENT_S, seconds / 3); // câu ngắn thì không đỏ ngay từ đầu
  return (
    <div ref={board} className="flex w-full flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[["Điểm", score, "text-primary"], ["Chuỗi đúng", `${streak.current} câu`, "text-foreground"], ["Thời gian", `${secLeft}s`, urgent ? "text-destructive" : "text-foreground"]].map(([k, v, c]) => (
          <div key={k} className="rounded-lg bg-background px-2 py-2">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className={`font-display text-2xl font-bold tabular-nums ${c}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="timebar" data-urgent={urgent || undefined} style={{ "--left": phase === "play" ? (deadline - now) / roundMs : 0 } as React.CSSProperties} aria-hidden />

      <div ref={question} tabIndex={-1} className="flex flex-col items-center gap-3 rounded-2xl border bg-background px-3 py-6 text-center outline-none">
        <p className="text-sm text-muted-foreground">Câu {idx + 1}/{qs.length}: chuỗi emoji này nói về gì?</p>
        <p key={idx} role="img" aria-label={`Chuỗi emoji ${q.emoji}`} className="emoji-clue flex flex-wrap justify-center gap-x-3 animate-in zoom-in-75 fade-in motion-reduce:animate-none">
          {graphemes(q.emoji).map((g, k) => <span key={k}>{g}</span>)}
        </p>
        <p aria-hidden className={`min-h-6 font-display font-bold ${phase === "right" ? "text-primary" : "text-destructive"}`}>{feedback}</p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, k) => {
          const shown = phase !== "play";
          const state = shown && k === q.answer ? "right" : shown && k === picked ? "wrong" : undefined;
          return (
            <li key={`${idx}-${k}`}>
              <Button
                variant={state === "right" ? "default" : "outline"}
                className={`h-auto min-h-12 w-full justify-start py-3 text-left text-base whitespace-normal ${state === "wrong" ? "border-destructive text-destructive" : ""}`}
                aria-disabled={shown || undefined}
                onClick={() => choose(k)}
              >
                {state === "right" && <LuCheck aria-label="Đáp án đúng" />}
                {state === "wrong" && <LuX aria-label="Bạn chọn sai" />}
                {o}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
