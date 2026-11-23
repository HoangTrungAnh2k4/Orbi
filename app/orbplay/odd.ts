// Điểm khác biệt: lưới icon giống nhau, có đúng 1 ô khác. Càng nhiều vòng lưới càng to, cặp icon càng giống.
import { cryptoRand, type Rand } from "./random.ts";

export type OddRound = { size: number; pair: number; swap: boolean; odd: number };

// 3×3 ba vòng đầu, rồi 4×4, 5×5, từ vòng 10 là 6×6
export const gridSize = (round: number) => (round < 3 ? 3 : round < 6 ? 4 : round < 10 ? 5 : 6);

// pairs xếp từ dễ tới khó; vòng r bốc trong cửa sổ quanh r để độ khó tăng dần mà vẫn đổi icon
export function makeRound(round: number, pairs: number, rand: Rand = cryptoRand): OddRound {
  const size = gridSize(round);
  const lo = Math.min(Math.max(0, round - 3), pairs - 1);
  const hi = Math.min(pairs - 1, round + 2);
  return {
    size,
    pair: lo + Math.floor(rand() * (hi - lo + 1)),
    swap: rand() < 0.5, // icon nào làm số đông cũng được
    odd: Math.floor(rand() * size * size),
  };
}

export const roundPoints = (size: number) => size * 5;
