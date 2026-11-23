// Lật thẻ ký ức: mỗi lượt lật 2 thẻ, giống nhau thì giữ ngửa, khác nhau thì UI úp lại sau một nhịp.
import { cryptoRand, drawIndices, type Rand } from "./random.ts";

export type Card = { face: number; matched: boolean };
export type Memory = { cards: Card[]; open: number[]; moves: number };
export type FlipResult = "ignore" | "first" | "match" | "miss";

export function newMemory(pairs: number, rand: Rand = cryptoRand): Memory {
  const faces = Array.from({ length: pairs }, (_, f) => [f, f]).flat();
  const order = drawIndices(faces.length, faces.length, rand);
  return { cards: order.map((i) => ({ face: faces[i], matched: false })), open: [], moves: 0 };
}

// lật thẻ i; "ignore" khi thẻ đã ngửa, đã ghép, hoặc đang chờ úp 2 thẻ sai
export function flip(m: Memory, i: number): { m: Memory; result: FlipResult } {
  if (m.open.length >= 2 || m.open.includes(i) || !m.cards[i] || m.cards[i].matched) return { m, result: "ignore" };
  if (!m.open.length) return { m: { ...m, open: [i] }, result: "first" };
  const j = m.open[0];
  const moves = m.moves + 1;
  if (m.cards[j].face === m.cards[i].face) {
    return { m: { cards: m.cards.map((c, k) => (k === i || k === j ? { ...c, matched: true } : c)), open: [], moves }, result: "match" };
  }
  return { m: { ...m, open: [j, i], moves }, result: "miss" };
}

export const hideOpen = (m: Memory): Memory => ({ ...m, open: [] });
export const solved = (m: Memory) => m.cards.length > 0 && m.cards.every((c) => c.matched);
