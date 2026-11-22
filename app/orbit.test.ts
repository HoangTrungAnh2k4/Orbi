import { test } from "node:test";
import assert from "node:assert/strict";
import { layout } from "./orbit.ts";

test("mỗi danh mục một vòng, tool chia đều trên vòng", () => {
  const tools = [
    { slug: "a", category: "Ảnh" },
    { slug: "b", category: "Tiện ích" },
    { slug: "c", category: "Ảnh" },
    { slug: "d", category: "Ảnh" },
  ];
  const rings = layout(tools, 100, 200);
  assert.deepEqual(rings.map((r) => [r.category, r.r]), [["Ảnh", 100], ["Tiện ích", 200]]);
  assert.deepEqual(rings[0].planets.map((p) => [p.slug, p.angle]), [["a", 0], ["c", 120], ["d", 240]]);
  assert.ok(rings[1].dur > rings[0].dur);
});

test("chỉ một danh mục thì nằm giữa", () => {
  assert.equal(layout([{ slug: "a", category: "X" }], 100, 200)[0].r, 150);
});
