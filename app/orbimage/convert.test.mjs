import { test } from "node:test";
import assert from "node:assert/strict";
import { bleed, outName, tooBig, MAX_SIDE } from "./convert.mjs";

test("đặt tên file output", () => {
  assert.equal(outName("cat.photo.jpg", "-nobg", "png"), "cat.photo-nobg.png");
  assert.equal(outName("noext", "", "webp"), "noext.webp");
  assert.equal(outName(".png", "-x2", "png"), "image-x2.png");
});

test("giới hạn kích thước", () => {
  assert.equal(tooBig(512, 400, MAX_SIDE.upscale), false);
  assert.equal(tooBig(400, 513, MAX_SIDE.upscale), true);
});

const rgba = (w, h, opaque) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (const [i, rgb] of opaque) data.set([...rgb, 255], i * 4);
  return { data, width: w, height: h };
};

test("bleed: màu loang ra mọi pixel trong suốt, alpha giữ nguyên", () => {
  const img = rgba(4, 4, [[0, [200, 50, 10]]]); // 1 pixel đỏ ở góc, còn lại trong suốt
  bleed(img);
  for (let i = 0; i < 16; i++) {
    assert.deepEqual([...img.data.slice(i * 4, i * 4 + 3)], [200, 50, 10], `pixel ${i}`);
    assert.equal(img.data[i * 4 + 3], i === 0 ? 255 : 0);
  }
});

test("bleed: pixel giữa hai màu lấy trung bình, không loang qua mép trái/phải", () => {
  const img = rgba(3, 1, [[0, [0, 0, 100]], [2, [100, 0, 0]]]);
  bleed(img);
  assert.deepEqual([...img.data.slice(4, 7)], [50, 0, 50]);
  // ảnh 3×2: đỏ ở cuối hàng 1 (pixel 2), xanh ở giữa hàng 2 (pixel 4).
  // pixel 3 (đầu hàng 2) chỉ kề pixel 4 và 0; nếu loang vòng qua mép thì nó sẽ dính đỏ của pixel 2
  const wrap = rgba(3, 2, [[2, [255, 0, 0]], [4, [0, 0, 255]]]);
  bleed(wrap);
  assert.deepEqual([...wrap.data.slice(12, 15)], [0, 0, 255]);
});

test("bleed: ảnh trong suốt hoàn toàn thì không làm gì", () => {
  const img = rgba(2, 2, []);
  bleed(img);
  assert.ok(img.data.every((v) => v === 0));
});
