import { test, mock } from "node:test";
import assert from "node:assert/strict";

// RawImage giả: chỉ đủ các hàm worker.js dùng, ghi lại crop/putAlpha để kiểm
class Img {
  constructor(w, h, ch, data) { Object.assign(this, { width: w, height: h, channels: ch, data }); }
  clone() { return new Img(this.width, this.height, this.channels, this.data.slice()); }
  split() { return [0, 1, 2, 3].map((c) => new Img(this.width, this.height, 1, this.data.filter((_, i) => i % 4 === c))); }
  rgb() { this.data = this.data.filter((_, i) => i % 4 !== 3); this.channels = 3; return this; }
  async crop([x0, y0, x1, y1]) { return Object.assign(this.clone(), { width: x1 - x0 + 1, height: y1 - y0 + 1 }); }
  async resize(w, h) { return Object.assign(this.clone(), { width: w, height: h }); }
  putAlpha(m) { this.alpha = m; return this; }
  // eslint-disable-next-line @typescript-eslint/no-this-alias -- mock cần giữ ảnh output để test kiểm tra
  async toBlob() { lastOut = this; return "blob"; }
}

const devices = [];
let input, lastOut;
mock.module("@huggingface/transformers", {
  namedExports: {
    AutoModel: {}, AutoProcessor: {},
    RawImage: { fromBlob: async () => input },
    pipeline: async (_task, _id, { device }) => {
      devices.push(device);
      // giả lập processor pad lên bội số 8 rồi phóng x2
      const run = async (img) => {
        if (device === "webgpu") throw new Error("GPU hỏng");
        return new Img(Math.ceil(img.width / 8) * 16, Math.ceil(img.height / 8) * 16, 3, new Uint8ClampedArray(0));
      };
      return Object.assign(run, { dispose() {} });
    },
  },
});
Object.defineProperty(globalThis, "navigator", { value: { gpu: { requestAdapter: async () => ({}) } } });
const posts = [];
globalThis.self = { postMessage: (m) => posts.push(m) };
await import("./worker.js");

const send = async (task) => {
  posts.length = 0;
  await self.onmessage({ data: { task, blob: null } });
  return posts.at(-1);
};

// 2×1 RGBA: pixel 0 đỏ đặc, pixel 1 trong suốt
const rgba = () => new Img(2, 1, 4, new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]));

test("WebGPU lỗi thì chạy lại bằng WASM, lần sau đi thẳng WASM", async () => {
  input = rgba();
  assert.equal((await send("x2")).type, "done");
  assert.deepEqual(devices, ["webgpu", "wasm"]);
  assert.equal((await send("x2")).type, "done");
  assert.deepEqual(devices, ["webgpu", "wasm"], "model wasm được cache, không load lại");
});

test("upscale ảnh trong suốt: cắt bỏ phần pad, gắn lại alpha đúng cỡ, không sửa ảnh gốc", async () => {
  input = rgba();
  const before = input.data.slice();
  const done = await send("x2");
  assert.deepEqual([done.w, done.h], [4, 2]); // model trả 16×16 vì pad, phải cắt về 2×1 nhân 2
  assert.deepEqual([lastOut.alpha.width, lastOut.alpha.height], [4, 2]);
  assert.deepEqual([...lastOut.alpha.data], [255, 0]); // alpha lấy từ ảnh gốc
  assert.deepEqual(input.data, before);
});

test("ảnh không có pixel trong suốt thì không gắn alpha", async () => {
  input = new Img(1, 1, 4, new Uint8ClampedArray([1, 2, 3, 255]));
  await send("x2");
  assert.equal(lastOut.alpha, undefined);
});
