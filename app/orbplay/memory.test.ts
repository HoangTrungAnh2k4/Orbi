import { test } from "node:test";
import assert from "node:assert/strict";
import { flip, hideOpen, newMemory, solved, type Memory } from "./memory.ts";

const deck = (faces: number[]): Memory => ({ cards: faces.map((face) => ({ face, matched: false })), open: [], moves: 0 });

test("newMemory: mỗi mặt đúng 2 thẻ", () => {
  const m = newMemory(8, Math.random);
  assert.equal(m.cards.length, 16);
  for (let f = 0; f < 8; f++) assert.equal(m.cards.filter((c) => c.face === f).length, 2);
});

test("lật trúng cặp thì giữ ngửa, tính 1 lượt", () => {
  let { m, result } = flip(deck([0, 1, 0, 1]), 0);
  assert.equal(result, "first");
  ({ m, result } = flip(m, 2));
  assert.equal(result, "match");
  assert.deepEqual(m.open, []);
  assert.equal(m.moves, 1);
  assert.ok(m.cards[0].matched && m.cards[2].matched);
  assert.equal(flip(m, 0).result, "ignore"); // thẻ đã ghép không lật lại được
});

test("lật sai thì chờ úp, không cho lật thẻ thứ 3", () => {
  let { m } = flip(deck([0, 1, 0, 1]), 0);
  const r = flip(m, 1);
  m = r.m;
  assert.equal(r.result, "miss");
  assert.deepEqual(m.open, [0, 1]);
  assert.equal(flip(m, 2).result, "ignore");
  assert.equal(flip(m, 0).result, "ignore");
  m = hideOpen(m);
  assert.equal(flip(m, 2).result, "first");
});

test("solved khi ghép hết", () => {
  let m = deck([0, 0]);
  assert.equal(solved(m), false);
  m = flip(flip(m, 0).m, 1).m;
  assert.equal(solved(m), true);
});
