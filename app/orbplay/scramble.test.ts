import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, parseWords, scramble } from "./scramble.ts";

test("normalize bỏ dấu, đ, khoảng trắng, hoa thường", () => {
  assert.equal(normalize("Đoàn kết"), "DOANKET");
  assert.equal(normalize(" team-work "), "TEAMWORK");
  assert.equal(normalize("Năm mới 2027"), "NAMMOI2027");
});

test("parseWords tách từ và gợi ý, bỏ dòng quá ngắn", () => {
  assert.deepEqual(parseWords("TEAMWORK - Làm việc nhóm\nBONUS|Tiền thưởng\nDEADLINE\nA - một chữ\nE-MAIL"), [
    { word: "TEAMWORK", hint: "Làm việc nhóm" },
    { word: "BONUS", hint: "Tiền thưởng" },
    { word: "DEADLINE", hint: "" },
    { word: "E-MAIL", hint: "" }, // gạch dính liền là một phần của từ
  ]);
});

test("parseWords gộp dấu dạng NFD để không tách dấu thành ô riêng", () => {
  const [w] = parseWords("Năm mới - Tết".normalize("NFD"));
  assert.equal(w.word, "Năm mới");
  assert.equal([...scramble(w.word, Math.random)].length, 6);
});

test("scramble giữ đủ chữ, khác thứ tự gốc", () => {
  for (let t = 0; t < 100; t++) {
    const out = scramble("Năm mới", Math.random);
    assert.deepEqual([...out].sort(), [..."NĂMMỚI"].sort());
    assert.notEqual(out.join(""), "NĂMMỚI");
  }
  assert.deepEqual(scramble("aa", Math.random), ["A", "A"]);
});
