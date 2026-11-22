import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "./rateLimit.ts";

test("rateLimit: cho tối đa max request mỗi khung, hết khung thì mở lại", () => {
  const r = (t: number) => rateLimit("ip1", 2, 1000, t);
  assert.deepEqual([r(0), r(10), r(20)], [true, true, false]);
  assert.equal(r(1000), true);
  assert.equal(rateLimit("ip2", 2, 1000, 20), true); // key khác đếm riêng
});
