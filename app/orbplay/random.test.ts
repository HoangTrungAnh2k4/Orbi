import { test } from "node:test";
import assert from "node:assert/strict";
import { drawIndices, expandPrizes, parseEntries, segmentAt, spinTo } from "./random.ts";

test("parseEntries bỏ dòng trống, trim khoảng trắng", () => {
  assert.deepEqual(parseEntries(" An \n\n  \nBình\r\nChi"), ["An", "Bình", "Chi"]);
});

test("drawIndices không trùng, không vượt n", () => {
  for (let t = 0; t < 200; t++) {
    const got = drawIndices(10, 4, Math.random);
    assert.equal(new Set(got).size, 4);
    assert.ok(got.every((i) => i >= 0 && i < 10));
  }
  assert.equal(drawIndices(3, 9, Math.random).length, 3);
  assert.deepEqual(drawIndices(0, 2, Math.random), []);
});

test("drawIndices gần đều", () => {
  const hit = Array(5).fill(0);
  for (let t = 0; t < 20000; t++) hit[drawIndices(5, 1, Math.random)[0]]++;
  assert.ok(hit.every((h) => Math.abs(h - 4000) < 400), String(hit));
});

test("spinTo dừng đúng ô, luôn quay tới trước", () => {
  for (const n of [2, 3, 7, 12]) {
    let rot = 0;
    for (let t = 0; t < 50; t++) {
      const i = Math.floor(Math.random() * n);
      const next = spinTo(rot, i, n, 6, Math.random);
      assert.ok(next > rot + 5 * 360, `${rot} → ${next}`);
      assert.equal(segmentAt(next, n), i);
      rot = next;
    }
  }
});

test("expandPrizes nhân bản theo xN, dòng thường giữ nguyên", () => {
  assert.deepEqual(expandPrizes("50k x3\n100k\nChúc may mắn ×2\nx5"), ["50k", "50k", "50k", "100k", "Chúc may mắn", "Chúc may mắn", "x5"]);
  assert.deepEqual(expandPrizes("Hộp x0"), []);
  assert.deepEqual(expandPrizes("Max5"), ["Max5"]);
  assert.equal(expandPrizes("a x9999", 500).length, 500);
});
