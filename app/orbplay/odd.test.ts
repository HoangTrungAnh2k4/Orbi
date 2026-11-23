import { test } from "node:test";
import assert from "node:assert/strict";
import { gridSize, makeRound } from "./odd.ts";

test("lưới to dần theo vòng, tối đa 6×6", () => {
  assert.deepEqual([0, 2, 3, 5, 6, 9, 10, 50].map(gridSize), [3, 3, 4, 4, 5, 5, 6, 6]);
});

test("makeRound: ô lạ nằm trong lưới, cặp icon nằm trong danh sách và khó dần", () => {
  for (let r = 0; r < 40; r++) {
    for (let t = 0; t < 30; t++) {
      const x = makeRound(r, 12, Math.random);
      assert.ok(x.odd >= 0 && x.odd < x.size * x.size);
      assert.ok(x.pair >= 0 && x.pair < 12);
      assert.ok(x.pair >= Math.min(Math.max(0, r - 3), 11), `vòng ${r} không quay lại cặp quá dễ`);
    }
  }
  assert.ok(makeRound(0, 12, () => 0.999).pair <= 2, "vòng đầu chỉ lấy cặp dễ");
});
