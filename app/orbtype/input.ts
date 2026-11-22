import { sameBase } from "./stats.mjs";

export type Game = {
  mode: string; // "time" | "words"
  words: string[];
  typed: string[];
  cur: number;
  keys: { correct: number; total: number };
  start: number;
};

// Áp chữ trong ô gõ ẩn vào game (mutate). Có khoảng trắng nghĩa là chốt từ.
// value: chữ cần ghi lại vào ô, null = để nguyên cho bộ gõ ghép dấu dở; done: đã gõ hết đề, gọi finish.
export function applyInput(game: Game, raw: string, now: number) {
  // NFC: bộ gõ kiểu "Unicode tổ hợp" gửi chữ gốc + dấu riêng, gộp lại cho khớp đề.
  // Thường mỗi event 1 ký tự, nhưng gõ nhanh có thể ra nhiều từ: phần trước mỗi khoảng trắng là từ đã chốt
  const parts = raw.normalize("NFC").split(/\s/);
  let v = "";
  let done = false;
  for (let k = 0; k < parts.length && !done; k++) {
    const w = game.words[game.cur];
    const t = game.typed[game.cur];
    v = parts[k].slice(0, w.length + 10);
    // chỉ đếm phím khi từ dài thêm; bộ gõ thay "nao" thành "nào" không tính là gõ thêm
    if (v.length > t.length) {
      if (!game.start) game.start = now;
      for (let j = t.length; j < v.length; j++) {
        game.keys.total++;
        if (sameBase(v[j], w[j] ?? "")) game.keys.correct++;
      }
    }
    game.typed[game.cur] = v;
    if (k === parts.length - 1) {
      // mode words: gõ đúng từ cuối là xong luôn, khỏi cần space
      if (game.mode === "words" && game.cur === game.words.length - 1 && v === w) { game.cur++; done = true; }
    } else if (v) {
      game.keys.total++;
      if (v === w) game.keys.correct++;
      game.cur++;
      game.typed.push("");
      if (game.cur >= game.words.length) done = true;
    }
  }
  // chỉ ghi lại ô khi có chốt từ hoặc bị cắt, để không phá chữ bộ gõ đang ghép dở
  const rewrite = raw !== v && (parts.length > 1 || parts[0].length > v.length);
  return { value: rewrite ? (done ? "" : v) : null, done };
}
