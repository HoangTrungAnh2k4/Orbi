import { test } from "node:test";
import assert from "node:assert/strict";
import { outName, tooBigToUpscale } from "./convert.mjs";

test("đặt tên file output", () => {
  assert.equal(outName("cat.photo.jpg", "-nobg", "png"), "cat.photo-nobg.png");
  assert.equal(outName("noext", "", "webp"), "noext.webp");
  assert.equal(outName(".png", "-x2", "png"), "image-x2.png");
});

test("giới hạn kích thước upscale", () => {
  assert.equal(tooBigToUpscale(512, 400), false);
  assert.equal(tooBigToUpscale(400, 513), true);
});
