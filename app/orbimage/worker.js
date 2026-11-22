import { AutoModel, AutoProcessor, pipeline, RawImage } from "@huggingface/transformers";
import { bleed } from "./convert.mjs";

// pin commit của model: repo model đổi file/config thì app không tự hỏng theo
const REV = {
  rmbg: "da1d078376e6691105a5530a374a010627fc60b5",
  x2: "71e28a83cfb61f5dc95bafdeebf2815167914f2b",
  x4: "d0e9926970c93e472ce2392373d72597fc849027",
};

const hasGpu = (async () => "gpu" in navigator && !!(await navigator.gpu.requestAdapter().catch(() => null)))();
const progress_callback = (p) => p.status === "progress_total" && self.postMessage({ type: "progress", progress: p.progress });

// RMBG-1.4 không chạy được qua pipeline "background-removal" nên làm tay theo model card
async function rmbg(opts) {
  const id = "briaai/RMBG-1.4";
  // shortcut: WebGPU tải bản fp32 176MB; có model_fp16 (88MB) nhưng chưa kiểm I/O fp16 và chưa test trên trình duyệt, cần nhẹ hơn thì thử
  const model = await AutoModel.from_pretrained(id, { ...opts, revision: REV.rmbg, config: { model_type: "custom" } });
  const processor = await AutoProcessor.from_pretrained(id, {
    revision: REV.rmbg,
    config: {
      do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5],
      feature_extractor_type: "ImageFeatureExtractor", image_std: [1, 1, 1], resample: 2,
      rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 },
    },
  });
  const run = async (img) => {
    const { pixel_values } = await processor(img);
    const { output } = await model({ input: pixel_values });
    const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(img.width, img.height);
    const out = img.clone();
    out.putAlpha(mask);
    return out;
  };
  return Object.assign(run, { dispose: () => model.dispose() });
}

// Swin2SR chỉ ăn RGB: ảnh có alpha thì tách alpha ra, phóng riêng rồi gắn lại vào kết quả
const upscale = (id, rev, scale) => async (opts) => {
  const run = await pipeline("image-to-image", id, { ...opts, revision: rev });
  const up = async (src) => {
    const img = src.clone(); // rgb() và bleed() sửa tại chỗ, giữ src nguyên cho lần retry
    const { width: w, height: h } = img;
    const alpha = img.channels === 4 && img.data.some((v, i) => i % 4 === 3 && v < 255) ? img.split()[3] : null;
    if (alpha) bleed(img);
    // processor pad ảnh lên bội số 8 mà pipeline không cắt lại, nên tự cắt về đúng kích thước
    const out = await (await run(img.rgb())).crop([0, 0, w * scale - 1, h * scale - 1]);
    return alpha ? out.putAlpha(await alpha.resize(out.width, out.height)) : out;
  };
  return Object.assign(up, { dispose: () => run.dispose() });
};

const MODELS = {
  removebg: rmbg,
  x2: upscale("Xenova/swin2SR-classical-sr-x2-64", REV.x2, 2),
  x4: upscale("Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr", REV.x4, 4),
};

// chỉ giữ 1 model trong bộ nhớ: đổi tool thì giải phóng model cũ (load lại từ cache trình duyệt mất vài giây)
const cache = {};
const drop = (keep) => Object.keys(cache).filter((k) => k !== keep).forEach((k) => {
  cache[k].then((m) => m.dispose()).catch(() => {});
  delete cache[k];
});
const load = (task, device) => {
  const k = task + device;
  if (!cache[k]) {
    drop(k);
    cache[k] = MODELS[task]({ device, progress_callback }).catch((e) => { delete cache[k]; throw e; });
  }
  return cache[k];
};

// WebGPU lỗi (driver cũ, thiếu VRAM...) thì thử lại bằng WASM. Chỉ coi là GPU hỏng khi WASM chạy được;
// WASM cũng lỗi nghĩa là lỗi không phải do GPU (mạng, ảnh...), báo lỗi gốc và lần sau vẫn thử GPU.
let gpuBroken = false;
async function process(task, img, onLoaded) {
  if (gpuBroken || !(await hasGpu)) {
    const run = await load(task, "wasm");
    onLoaded();
    return run(img);
  }
  try {
    const run = await load(task, "webgpu");
    onLoaded();
    return await run(img);
  } catch (gpuErr) {
    console.warn("WebGPU lỗi, thử WASM:", gpuErr);
    drop(); // bỏ model GPU trước để khỏi giữ hai bản cùng lúc
    try {
      const run = await load(task, "wasm");
      onLoaded(); // để status không kẹt ở "Đang tải model… 100%" lúc WASM đang chạy
      const out = await run(img);
      gpuBroken = true;
      return out;
    } catch {
      throw gpuErr;
    }
  }
}

self.onmessage = async ({ data: { task, blob } }) => {
  try {
    const out = await process(task, await RawImage.fromBlob(blob), () => self.postMessage({ type: "status", text: "Đang xử lý…" }));
    const img = Array.isArray(out) ? out[0] : out;
    self.postMessage({ type: "done", blob: await img.toBlob("image/png"), w: img.width, h: img.height });
  } catch (e) {
    self.postMessage({ type: "error", text: String(e?.message ?? e) });
  }
};
