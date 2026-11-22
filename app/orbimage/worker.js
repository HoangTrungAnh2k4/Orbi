import { AutoModel, AutoProcessor, pipeline, RawImage } from "@huggingface/transformers";

const device = (async () => ("gpu" in navigator && (await navigator.gpu.requestAdapter().catch(() => null)) ? "webgpu" : "wasm"))();
const progress_callback = (p) => p.status === "progress_total" && self.postMessage({ type: "progress", progress: p.progress });

// RMBG-1.4 không chạy được qua pipeline "background-removal" nên làm tay theo model card
async function rmbg(opts) {
  const id = "briaai/RMBG-1.4";
  const model = await AutoModel.from_pretrained(id, { ...opts, config: { model_type: "custom" } });
  const processor = await AutoProcessor.from_pretrained(id, {
    config: {
      do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5],
      feature_extractor_type: "ImageFeatureExtractor", image_std: [1, 1, 1], resample: 2,
      rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 },
    },
  });
  return async (img) => {
    const { pixel_values } = await processor(img);
    const { output } = await model({ input: pixel_values });
    const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(img.width, img.height);
    const out = img.clone();
    out.putAlpha(mask);
    return out;
  };
}

const MODELS = {
  removebg: rmbg,
  x2: (opts) => pipeline("image-to-image", "Xenova/swin2SR-classical-sr-x2-64", opts),
  x4: (opts) => pipeline("image-to-image", "Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr", opts),
};

// load model 1 lần rồi giữ lại; lỗi thì xóa cache để lần sau thử lại
const cache = {};
const load = (task) => (cache[task] ??= device.then((device) => MODELS[task]({ device, progress_callback }))
  .catch((e) => { delete cache[task]; throw e; }));

self.onmessage = async ({ data: { id, task, blob } }) => {
  try {
    const run = await load(task);
    self.postMessage({ type: "status", id, text: "Đang xử lý…" });
    const out = await run(await RawImage.fromBlob(blob));
    const img = Array.isArray(out) ? out[0] : out;
    self.postMessage({ type: "done", id, blob: await img.toBlob("image/png"), w: img.width, h: img.height });
  } catch (e) {
    self.postMessage({ type: "error", id, text: String(e?.message ?? e) });
  }
};
