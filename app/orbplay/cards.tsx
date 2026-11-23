import type { IconType } from "react-icons";
import {
  LuAlarmClock, LuBell, LuCake, LuCandy, LuCrown, LuGift, LuMoon, LuMusic, LuPartyPopper, LuRocket, LuSparkles, LuStar, LuWine,
} from "react-icons/lu";
import type { Memory } from "./memory";

// mặt thẻ theo chủ đề tiệc giao thừa, tên dùng cho trình đọc màn hình
const FACES: [IconType, string][] = [
  [LuGift, "Hộp quà"], [LuPartyPopper, "Pháo giấy"], [LuWine, "Ly rượu"], [LuAlarmClock, "Đồng hồ"],
  [LuStar, "Ngôi sao"], [LuMoon, "Trăng"], [LuBell, "Chuông"], [LuCake, "Bánh kem"],
  [LuMusic, "Nốt nhạc"], [LuCandy, "Kẹo"], [LuRocket, "Pháo thăng thiên"], [LuCrown, "Vương miện"],
]; // đủ cho mức Khó 12 cặp

type Props = { game: Memory; round: number; onFlip: (i: number, el: HTMLButtonElement) => void };

export function MemoryBoard({ game, round, onFlip }: Props) {
  const cols = game.cards.length > 16 ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4";
  return (
    <ol key={round} className={`grid w-full gap-2 sm:gap-3 ${cols}`}>
      {game.cards.map((c, i) => {
        const [Icon, name] = FACES[c.face];
        const up = c.matched || game.open.includes(i);
        const miss = game.open.length === 2 && game.open.includes(i);
        return (
          <li key={i} className="envelope-deal" style={{ "--i": i } as React.CSSProperties}>
            <button
              type="button"
              className="mcard"
              data-up={up || undefined}
              data-matched={c.matched || undefined}
              data-miss={miss || undefined}
              aria-disabled={up}
              aria-label={up ? `Thẻ ${i + 1}: ${name}${c.matched ? ", đã ghép" : ""}` : `Lật thẻ ${i + 1}`}
              onClick={(e) => onFlip(i, e.currentTarget)}
            >
              <span className="mcard-inner">
                <span className="mcard-face mcard-back" aria-hidden><LuSparkles /></span>
                <span className={`mcard-face mcard-front face-${c.face % 6}`} aria-hidden><Icon /></span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
