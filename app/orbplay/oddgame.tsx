"use client";
import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  LuAlarmClock, LuBell, LuBellRing, LuCake, LuCakeSlice, LuClock, LuClock4, LuCloud, LuCloudSnow, LuGift, LuHourglass, LuLaugh,
  LuLock, LuLockOpen, LuMartini, LuMoon, LuMoonStar, LuMusic, LuMusic2, LuPackage, LuPlay, LuRotateCcw, LuSmile, LuSparkle,
  LuStar, LuSun, LuSunMedium, LuTimer, LuTimerOff, LuWine,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { makeRound, roundPoints, type OddRound } from "./odd";
import { sfx } from "./fx";

const TOTAL_MS = 45_000;
const PENALTY_MS = 3_000; // bấm sai bị trừ giờ, khỏi bấm bừa
const URGENT_MS = 10_000;

type Icon = [IconType, string];
// cặp icon na ná nhau, xếp từ dễ tới khó; tên chỉ để đọc code, không đưa vào aria-label kẻo lộ đáp án
const PAIRS: [Icon, Icon][] = [
  [[LuAlarmClock, "Đồng hồ báo thức"], [LuHourglass, "Đồng hồ cát"]],
  [[LuGift, "Hộp quà"], [LuPackage, "Thùng hàng"]],
  [[LuCloud, "Mây"], [LuCloudSnow, "Mây tuyết"]],
  [[LuBell, "Chuông"], [LuBellRing, "Chuông đang reo"]],
  [[LuStar, "Ngôi sao"], [LuSparkle, "Lấp lánh"]],
  [[LuWine, "Ly vang"], [LuMartini, "Ly cocktail"]],
  [[LuMoon, "Trăng"], [LuMoonStar, "Trăng và sao"]],
  [[LuCake, "Bánh kem"], [LuCakeSlice, "Miếng bánh"]],
  [[LuTimer, "Bấm giờ"], [LuTimerOff, "Tắt bấm giờ"]],
  [[LuSmile, "Mặt cười"], [LuLaugh, "Cười lớn"]],
  [[LuLock, "Khóa đóng"], [LuLockOpen, "Khóa mở"]],
  [[LuMusic, "Nốt nhạc"], [LuMusic2, "Nốt nhạc đơn"]],
  [[LuSun, "Mặt trời"], [LuSunMedium, "Mặt trời nhỏ"]],
  [[LuClock, "Đồng hồ 3 giờ"], [LuClock4, "Đồng hồ 4 giờ"]],
];

type Phase = "idle" | "play" | "done";
type Props = { onPlaying: (on: boolean) => void; play: (fn: () => void) => void; celebrate: (el: Element | null) => void; announce: (msg: string) => void };

export function OddGame({ onPlaying, play, celebrate, announce }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState<OddRound | null>(null);
  const [passed, setPassed] = useState(0);
  const [score, setScore] = useState(0);
  const [now, setNow] = useState(0);
  const [wrong, setWrong] = useState(-1);
  const end = useRef(0); // ref vì bấm sai sẽ kéo lùi hạn chót
  const tick = useRef(0);
  const board = useRef<HTMLDivElement>(null);
  const stats = useRef({ passed: 0, score: 0 });

  useEffect(() => () => clearInterval(tick.current), []);
  const inGame = phase === "play";
  useEffect(() => {
    onPlaying(inGame); // page khóa tab khi đang chơi, đổi tab sẽ mất ván
    return () => onPlaying(false);
  }, [inGame, onPlaying]);

  const start = () => {
    play(sfx.unlock);
    stats.current = { passed: 0, score: 0 };
    setPassed(0);
    setScore(0);
    setWrong(-1);
    setRound(makeRound(0, PAIRS.length));
    setPhase("play");
    end.current = Date.now() + TOTAL_MS;
    setNow(Date.now());
    clearInterval(tick.current);
    tick.current = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t < end.current) return;
      clearInterval(tick.current);
      setPhase("done");
      const { passed: p, score: s } = stats.current;
      announce(`Hết giờ! Qua ${p} vòng, ${s} điểm`);
      if (p) celebrate(board.current);
    }, 100);
  };

  const pick = (i: number, r: OddRound) => {
    if (phase !== "play" || Date.now() >= end.current) return; // interval tới 100ms mới chuyển sang done
    if (i === r.odd) {
      const pts = roundPoints(r.size);
      stats.current = { passed: stats.current.passed + 1, score: stats.current.score + pts };
      setPassed(stats.current.passed);
      setScore(stats.current.score);
      setWrong(-1);
      setRound(makeRound(stats.current.passed, PAIRS.length));
      play(() => sfx.count(true));
    } else {
      end.current -= PENALTY_MS;
      setWrong(i);
      play(sfx.miss);
      announce("Sai, trừ 3 giây");
    }
  };

  const left = Math.max(0, end.current - now);

  if (phase !== "play" || !round) {
    const done = phase === "done";
    return (
      <div ref={board} className="flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-6 text-center">
        {done ? (
          <>
            <p className="font-display text-2xl font-bold">Hết giờ!</p>
            <p className="animate-in zoom-in-75 fade-in font-display text-5xl font-bold text-primary motion-reduce:animate-none">{score} điểm</p>
            <p className="text-muted-foreground">Qua {passed} vòng</p>
          </>
        ) : (
          <p className="max-w-sm text-muted-foreground">
            Có {TOTAL_MS / 1000} giây. Mỗi vòng có đúng 1 ô khác các ô còn lại, bấm vào nó càng nhanh càng tốt. Bấm sai bị trừ {PENALTY_MS / 1000} giây, lưới to dần và icon giống nhau dần.
          </p>
        )}
        <Button size="lg" className="h-11 px-8 font-display text-xl font-bold" onClick={start}>
          {done ? <LuRotateCcw aria-hidden /> : <LuPlay aria-hidden />} {done ? "Chơi lại" : "Bắt đầu"}
        </Button>
      </div>
    );
  }

  const [main, odd] = round.swap ? [PAIRS[round.pair][1], PAIRS[round.pair][0]] : PAIRS[round.pair];
  const urgent = left <= URGENT_MS;
  return (
    <div ref={board} className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Đã qua <b className="font-display text-lg text-foreground">{passed}</b> vòng</span>
        <span><b className="font-display text-lg text-primary">{score}</b> điểm</span>
        <span className={urgent ? "font-bold text-destructive" : ""}>Còn <b className="font-display text-lg tabular-nums">{Math.ceil(left / 1000)}s</b></span>
      </div>
      <div className="timebar" data-urgent={urgent || undefined} style={{ "--left": left / TOTAL_MS } as React.CSSProperties} aria-hidden />
      <p className="text-center text-muted-foreground">Bấm vào ô khác biệt</p>
      <ol
        key={passed}
        className="odd-grid animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none"
        style={{ "--n": round.size } as React.CSSProperties}
      >
        {Array.from({ length: round.size * round.size }, (_, i) => {
          const [Icon] = i === round.odd ? odd : main;
          return (
            <li key={i}>
              <button
                type="button"
                className={`odd-cell face-${round.pair % 6}`}
                data-wrong={wrong === i || undefined}
                aria-label={`Ô ${i + 1}`} // không đọc tên icon, đọc là lộ ngay ô khác
                onClick={() => pick(i, round)}
              >
                <Icon aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
