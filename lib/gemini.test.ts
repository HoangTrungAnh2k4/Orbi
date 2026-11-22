import { test } from "node:test";
import assert from "node:assert/strict";
import { gemini } from "./gemini.ts";

process.env.GEMINI_API_KEY = "test";
const ok = (text: string) => Response.json({ candidates: [{ content: { parts: [{ text }] } }] });

// fetch giả: trả lời theo model trong URL, ghi lại thứ tự đã gọi
const fake = (byModel: Record<string, () => Response>, calls: string[]) =>
  (async (url: string | URL | Request) => {
    const model = String(url).match(/models\/(.+):/)![1];
    calls.push(model);
    return byModel[model]();
  }) as typeof fetch;

test("model bị 429 thì chuyển model kế, lần sau đẩy nó xuống cuối", async () => {
  const calls: string[] = [];
  const fetcher = fake({ a: () => new Response("limit", { status: 429 }), b: () => ok("xin chào") }, calls);
  assert.equal(await gemini("p", { models: ["a", "b"], fetcher }), "xin chào");
  assert.equal(await gemini("p", { models: ["a", "b"], fetcher }), "xin chào");
  assert.deepEqual(calls, ["a", "b", "b"]);
});

test("lỗi 4xx riêng của model hoặc body hỏng thì vẫn thử model kế", async () => {
  const calls: string[] = [];
  const fetcher = fake({
    c: () => new Response("not available", { status: 403 }),
    d: () => new Response("<html>", { status: 200 }),
    g: () => ok("x"),
  }, calls);
  assert.equal(await gemini("p", { models: ["c", "d", "g"], fetcher }), "x");
  assert.deepEqual(calls, ["c", "d", "g"]);
});

test("mọi model đều limit thì báo lỗi gộp", async () => {
  const fetcher = fake({ e: () => new Response("", { status: 429 }), f: () => new Response("", { status: 503 }) }, []);
  await assert.rejects(gemini("p", { models: ["e", "f"], fetcher }), /e: 429[\s\S]*f: 503/);
});

test("client đã bỏ (signal abort) thì không gọi model nào nữa", async () => {
  const calls: string[] = [];
  const fetcher = fake({ h: () => ok("x") }, calls);
  await assert.rejects(gemini("p", { models: ["h"], fetcher, signal: AbortSignal.abort() }));
  assert.deepEqual(calls, []);
});
