// words: đề bài, typed: những gì đã gõ theo từng từ, cur: index từ đang gõ
// (= words.length khi đã gõ xong hết), keys: {correct, total} số phím đã bấm, ms: thời gian.
export function computeStats(words, typed, cur, keys, ms) {
  const chars = { correct: 0, incorrect: 0, extra: 0, missed: 0 };
  let correctChars = 0; // chỉ tính từ gõ đúng hoàn toàn (+ dấu cách), như kiểu WPM chuẩn
  // mỗi lần bấm space là typed thêm 1 ô, nên số space đã gõ = typed.length - 1
  // (kể cả space chốt từ cuối ở mode words khi từ đó sai)
  let rawChars = typed.length - 1;

  for (let i = 0; i <= Math.min(cur, words.length - 1); i++) {
    const w = words[i];
    const t = typed[i] ?? "";
    const done = i < cur;
    rawChars += t.length;
    for (let j = 0; j < Math.max(w.length, t.length); j++) {
      if (j >= w.length) chars.extra++;
      else if (j >= t.length) { if (done) chars.missed++; }
      else if (t[j] === w[j]) chars.correct++;
      else chars.incorrect++;
    }
    if (done && t === w) correctChars += w.length + (i < words.length - 1 ? 1 : 0);
    if (!done && w.startsWith(t)) correctChars += t.length; // từ đang gõ dở lúc hết giờ
  }

  const min = ms / 60000 || 1 / 60000;
  return {
    wpm: Math.round(correctChars / 5 / min),
    raw: Math.round(rawChars / 5 / min),
    acc: keys.total ? Math.round((100 * keys.correct) / keys.total) : 0,
    chars,
    seconds: Math.round(ms / 1000),
  };
}

// bỏ dấu tiếng Việt: Unikey/EVKey gõ "e" rồi mới thay bằng "ệ", nên chữ đang gõ dở chỉ cần khớp chữ gốc
const base = (c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
export const sameBase = (a, b) => base(a) === base(b);
