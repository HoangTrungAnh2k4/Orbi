import { test } from "node:test";
import assert from "node:assert/strict";
import { makeQuestion, parseEmoji, points } from "./emoji.ts";

test("parseEmoji tách emoji và đáp án, bỏ dòng thiếu vế", () => {
  assert.deepEqual(parseEmoji("🎓📚 - Đào tạo\n🧧|Lì xì\nchỉ có chữ\n🎉 - \n\n🌕🥮 – Trung thu"), [
    { emoji: "🎓📚", answer: "Đào tạo" },
    { emoji: "🧧", answer: "Lì xì" },
    { emoji: "🌕🥮", answer: "Trung thu" },
  ]);
});

test("makeQuestion có đúng 1 đáp án đúng, không trùng lựa chọn", () => {
  const items = parseEmoji("a - Một\nb - Hai\nc - Ba\nd - Bốn\ne - Năm\nf - một");
  for (let t = 0; t < 200; t++) {
    const q = makeQuestion(items, 0, 4, Math.random);
    assert.equal(q.options.length, 4);
    assert.equal(q.options[q.answer], "Một");
    assert.equal(new Set(q.options.map((o) => o.toLowerCase())).size, 4); // "một" trùng chữ với đáp án nên không được lọt vào
  }
});

test("makeQuestion bộ ít câu thì ít lựa chọn", () => {
  const q = makeQuestion(parseEmoji("a - Một\nb - Hai"), 1, 4, Math.random);
  assert.deepEqual([...q.options].sort(), ["Hai", "Một"]);
  assert.equal(q.options[q.answer], "Hai");
});

test("points: tốc độ theo giờ còn lại, chuỗi có trần", () => {
  assert.deepEqual(points(15_000, 15_000, 1), { base: 20, speed: 10, streak: 0 });
  assert.deepEqual(points(7_500, 15_000, 3), { base: 20, speed: 5, streak: 10 });
  assert.deepEqual(points(-100, 15_000, 99), { base: 20, speed: 0, streak: 20 });
});
