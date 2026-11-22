import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "./stats.mjs";

test("gõ đúng hết 2 từ trong 6 giây", () => {
  const s = computeStats(["ab", "cd"], ["ab", "cd"], 2, { correct: 5, total: 5 }, 6000);
  assert.equal(s.wpm, 10); // (2+1+2)/5 / 0.1 phút
  assert.equal(s.raw, 10);
  assert.equal(s.acc, 100);
  assert.deepEqual(s.chars, { correct: 4, incorrect: 0, extra: 0, missed: 0 });
});

test("từ sai, thừa, thiếu và từ đang gõ dở", () => {
  const s = computeStats(["ab", "cd", "ef"], ["axz", "c", "e"], 2, { correct: 3, total: 6 }, 6000);
  assert.deepEqual(s.chars, { correct: 3, incorrect: 1, extra: 1, missed: 1 });
  assert.equal(s.wpm, 2); // chỉ tính "e" đang gõ dở: 1 ký tự
  assert.equal(s.acc, 50);
});

test("mode words: từ cuối sai, chốt bằng space thì space đó vẫn tính vào raw", () => {
  const s = computeStats(["ab", "cd"], ["ab", "cx", ""], 2, { correct: 5, total: 6 }, 6000);
  assert.equal(s.raw, 12); // ab + space + cx + space = 6 ký tự
  assert.equal(s.wpm, 6); // chỉ "ab " đúng = 3 ký tự
});
