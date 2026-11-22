import { test } from "node:test";
import assert from "node:assert/strict";
import { applyInput, type Game } from "./input.ts";

const game = (words: string[], mode = "time"): Game => ({ mode, words, typed: [""], cur: 0, keys: { correct: 0, total: 0 }, start: 0 });
// gõ lần lượt từng trạng thái của ô như bộ gõ gửi lên, ô được ghi lại giống page.jsx
const typeSeq = (g: Game, seq: string[]) => {
  let box = "";
  let res = { value: null as string | null, done: false };
  for (const s of seq) {
    box = s;
    res = applyInput(g, box, 1000);
    if (res.value !== null) box = res.value;
  }
  return { box, ...res };
};

test("Telex thay chữ tại chỗ: 'Vu' → 'Vũ' không tính thêm phím, chốt từ đúng", () => {
  const g = game(["Vũ", "trụ"]);
  const r = typeSeq(g, ["V", "Vu", "Vũ", "Vũ "]);
  assert.deepEqual(g.typed, ["Vũ", ""]);
  assert.equal(g.cur, 1);
  assert.deepEqual(g.keys, { correct: 3, total: 3 }); // V, u, space
  assert.equal(r.box, "");
  assert.equal(g.start, 1000);
});

test("Unicode tổ hợp: chữ gốc + dấu rời được gộp NFC, ô không bị ghi đè khi đang ghép", () => {
  const g = game(["trụ"]);
  const r = applyInput(g, "trụ", 0);
  assert.equal(g.typed[0], "trụ");
  assert.equal(r.value, null);
});

test("space ở đầu từ bị bỏ qua, không chốt từ rỗng", () => {
  const g = game(["ab"]);
  const r = applyInput(g, " ", 0);
  assert.equal(g.cur, 0);
  assert.equal(g.keys.total, 0);
  assert.equal(r.value, "");
});

test("gõ nhiều từ trong một event: chốt lần lượt, từ sai không được tính đúng", () => {
  const g = game(["ab", "cd", "ef"]);
  const r = applyInput(g, "ab cx e", 0);
  assert.deepEqual(g.typed, ["ab", "cx", "e"]);
  assert.equal(g.cur, 2);
  assert.deepEqual(g.keys, { correct: 5, total: 7 }); // a b ␣ c x(sai) ␣(từ sai) e
  assert.equal(r.value, "e");
});

test("từ quá dài bị cắt ở độ dài đề + 10", () => {
  const g = game(["a"]);
  const r = applyInput(g, "a".repeat(20), 0);
  assert.equal(g.typed[0].length, 11);
  assert.equal(r.value, "a".repeat(11));
});

test("mode words: gõ đúng từ cuối là xong, gõ sai thì phải space mới xong", () => {
  const ok = game(["ab", "cd"], "words");
  assert.equal(typeSeq(ok, ["ab ", "c", "cd"]).done, true);
  assert.equal(ok.cur, 2);

  const bad = game(["ab"], "words");
  assert.equal(applyInput(bad, "ax", 0).done, false);
  const r = applyInput(bad, "ax ", 0);
  assert.equal(r.done, true);
  assert.equal(r.value, "");
});

test("mode time: hết từ trong đề thì done, phần sau bỏ qua", () => {
  const g = game(["a"]);
  const r = applyInput(g, "a b", 0);
  assert.equal(r.done, true);
  assert.equal(g.cur, 1);
  assert.equal(g.typed.length, 2);
});
