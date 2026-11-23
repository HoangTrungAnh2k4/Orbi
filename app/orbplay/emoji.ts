// Đoán emoji: hiện một chuỗi emoji, chọn đúng cụm từ trong 4 đáp án.
import { cryptoRand, drawIndices, parseEntries, type Rand } from "./random.ts";

export type EmojiItem = { emoji: string; answer: string };
export type EmojiQuestion = { emoji: string; options: string[]; answer: number };

// mỗi dòng "🎓📚💡 - Đáp án" (gạch có cách hai bên, hoặc |); thiếu một vế thì bỏ
export const parseEmoji = (text: string): EmojiItem[] =>
  parseEntries(text)
    .map((line) => line.match(/^(.+?)\s+[-–|]\s+(.+)$/) ?? line.match(/^(.+?)\s*\|\s*(.+)$/))
    .filter((m) => m !== null)
    .map((m) => ({ emoji: m[1].trim(), answer: m[2].trim() }));

// đáp án nhiễu bốc từ các câu khác, bỏ trùng chữ với đáp án đúng; bộ ít câu thì ít lựa chọn hơn
export function makeQuestion(items: EmojiItem[], i: number, size = 4, rand: Rand = cryptoRand): EmojiQuestion {
  const right = items[i].answer;
  const others = [...new Set(items.map((x) => x.answer))].filter((a) => a.toLowerCase() !== right.toLowerCase());
  const options = [right, ...drawIndices(others.length, size - 1, rand).map((k) => others[k])];
  const order = drawIndices(options.length, options.length, rand);
  return { emoji: items[i].emoji, options: order.map((k) => options[k]), answer: order.indexOf(0) };
}

// chuẩn 20, tốc độ tối đa 10 theo phần giờ còn lại, chuỗi từ câu đúng thứ 2 mỗi câu +5, trần 20
export const points = (leftMs: number, totalMs: number, streak: number) => ({
  base: 20,
  speed: Math.round((10 * Math.max(0, leftMs)) / totalMs),
  streak: Math.min(20, Math.max(0, streak - 1) * 5),
});
