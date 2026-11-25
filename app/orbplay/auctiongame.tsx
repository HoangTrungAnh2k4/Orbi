"use client";
import { useEffect, useRef, useState } from "react";
import { LuGavel, LuRotateCcw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import type { AuctionResult, BidGroup } from "./auction";
import { sfx } from "./fx";

const COUNT_FROM = 3;
const COUNT_MS = 1000;
const REVEAL_MS = 6000; // tổng thời gian lật số, nhiều số thì lật nhanh hơn

type Phase = "idle" | "count" | "reveal" | "done";
type Props = {
  result: AuctionResult; // đã cắt tới số thắng
  prize: string;
  onPlaying: (on: boolean) => void; // page khóa tab khi đang công bố
  play: (fn: () => void) => void;
  celebrate: (el: Element | null) => void;
  announce: (msg: string) => void;
};

export function AuctionGame({ result: r, prize, onPlaying, play, celebrate, announce }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [n, setN] = useState(COUNT_FROM);
  const [groups, setGroups] = useState<BidGroup[]>([]);
  const [shown, setShown] = useState(0);
  const [winner, setWinner] = useState(-1);
  const timers = useRef<number[]>([]);
  const board = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const inGame = phase === "count" || phase === "reveal";
  useEffect(() => {
    onPlaying(inGame);
    return () => onPlaying(false);
  }, [inGame, onPlaying]);

  // số mới lật luôn nằm trong khung nhìn của danh sách cuộn
  useEffect(() => { list.current?.lastElementChild?.scrollIntoView({ block: "nearest" }); }, [shown]);

  const start = () => {
    const steps = r.groups.length; // resolveAuction đã dừng ngay ở số thắng
    setGroups(r.groups);
    setWinner(r.winner);
    setShown(0);
    play(sfx.unlock);
    const finish = () => {
      setShown(steps);
      setPhase("done");
      if (r.winner < 0) {
        play(sfx.miss);
        return announce("Không ai thắng, số nào cũng có người trùng");
      }
      const g = r.groups[r.winner];
      announce(`${g.names[0]} thắng với số ${g.value}`);
      celebrate(board.current);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();

    const gap = Math.min(900, REVEAL_MS / steps);
    const reveal = (k: number) => {
      if (k === steps) return later(finish, 400);
      setShown(k + 1);
      play(sfx.tick);
      later(() => reveal(k + 1), gap);
    };
    const count = (k: number) => {
      if (k === 0) {
        play(() => sfx.count(true));
        setPhase("reveal");
        return reveal(0);
      }
      setN(k);
      play(() => sfx.count(false));
      later(() => count(k - 1), COUNT_MS);
    };
    setPhase("count");
    count(COUNT_FROM);
  };

  const g = winner >= 0 ? groups[winner] : null;
  const revealed = groups.slice(0, shown);
  const out = revealed.filter((x) => x.names.length > 1).reduce((s, x) => s + x.names.length, 0);

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="rounded-xl border border-primary bg-background px-4 py-3 text-center">
        <span className="block text-sm text-muted-foreground">Gói quà đấu giá</span>
        <span className="font-display text-2xl font-bold text-primary">{prize || "Chưa đặt phần thưởng"}</span>
      </p>

      <div ref={board} aria-hidden className="board flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center" data-mode={phase === "done" && g ? "win" : "idle"}>
        {phase === "count" ? (
          <span key={n} className="animate-in zoom-in-50 fade-in font-display text-7xl font-extrabold text-primary duration-300 motion-reduce:animate-none">{n}</span>
        ) : phase === "reveal" ? (
          <>
            <span className="font-display text-5xl font-extrabold tabular-nums">{revealed.at(-1)?.value ?? "…"}</span>
            <span className="mt-1 text-sm text-muted-foreground">Đang dò từ số nhỏ nhất…</span>
          </>
        ) : phase === "done" ? (
          g ? (
            <>
              <span className="animate-in zoom-in-50 fade-in line-clamp-1 font-display text-5xl font-extrabold text-primary duration-300 motion-reduce:animate-none">{g.names[0]}</span>
              <span className="mt-1 text-muted-foreground">thắng với số <b className="font-display text-xl text-foreground">{g.value}</b>, không trùng ai</span>
            </>
          ) : (
            <>
              <span className="font-display text-4xl font-extrabold">Không ai thắng</span>
              <span className="mt-1 text-muted-foreground">Số nào cũng có người trùng, quà giữ lại vòng sau</span>
            </>
          )
        ) : (
          <>
            <span className="font-display text-5xl font-extrabold text-muted-foreground">{r.count} phiếu</span>
            <span className="mt-1 max-w-sm text-sm text-muted-foreground">Số nhỏ nhất và không trùng ai sẽ thắng. Số trùng bị loại hết.</span>
          </>
        )}
      </div>

      {revealed.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Đã loại <b className="font-display text-lg text-foreground">{out}</b> người vì trùng số
          </p>
          <ol ref={list} aria-label="Các số đã lật, từ nhỏ đến lớn" className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {revealed.map((x, i) => {
              const win = i === winner;
              return (
                <li
                  key={x.value}
                  className={`animate-in zoom-in-75 fade-in flex items-baseline gap-1.5 rounded-full px-3 py-1 duration-200 motion-reduce:animate-none ${win ? "bg-primary text-primary-foreground" : "border border-dashed border-destructive"}`}
                >
                  <span className={`font-display text-xl font-bold tabular-nums ${win ? "" : "line-through decoration-destructive decoration-2"}`}>{x.value}</span>
                  <span className={`text-xs ${win ? "" : "text-muted-foreground"}`}>{win ? "duy nhất" : `${x.names.length} người trùng`}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <Button size="lg" className="h-11 self-center px-8 font-display text-xl font-bold" onClick={start} disabled={inGame || !r.count}>
        {phase === "done" ? <LuRotateCcw aria-hidden /> : <LuGavel aria-hidden />} {inGame ? "Đang công bố…" : phase === "done" ? "Công bố lại" : "Công bố kết quả"}
      </Button>
    </div>
  );
}
