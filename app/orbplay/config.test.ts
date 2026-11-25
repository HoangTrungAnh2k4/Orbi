import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, forPlayers, sanitizeConfig } from "./config.ts";

test("rác hoặc rỗng thì ra cấu hình mặc định", () => {
  for (const bad of [null, undefined, 42, "x", [], {}]) assert.deepEqual(sanitizeConfig(bad), DEFAULT_CONFIG);
});

test("giữ giá trị hợp lệ, kẹp số ngoài khoảng, bỏ sai kiểu", () => {
  const c = sanitizeConfig({
    enabled: { wheel: false, odd: "no", hack: true },
    locked: true,
    people: "A\nB",
    prizes: 123,
    draw: { countFrom: 99 },
    memory: { pairs: 7 },
    word: { rounds: 3.6, seconds: -5 },
    odd: { seconds: Infinity, penalty: 2 },
    emoji: { rounds: 0, seconds: 999 },
    extra: "bị bỏ",
  });
  assert.equal(c.enabled.wheel, false);
  assert.equal(c.enabled.odd, true); // sai kiểu → mặc định
  assert.equal("hack" in c.enabled, false);
  assert.equal(c.locked, true);
  assert.equal(c.people, "A\nB");
  assert.equal(c.prizes, DEFAULT_CONFIG.prizes);
  assert.equal(c.draw.countFrom, 10);
  assert.equal(c.memory.pairs, 8); // 7 không phải mức có sẵn
  assert.deepEqual(c.word, { rounds: 4, seconds: 10 });
  assert.deepEqual(c.odd, { seconds: 45, penalty: 2 });
  assert.deepEqual(c.emoji, { rounds: 1, seconds: 60 });
  assert.equal("extra" in c, false);
});

test("cắt text quá dài", () => {
  assert.equal(sanitizeConfig({ words: "x".repeat(50_000) }).words.length, 20_000);
  assert.equal(sanitizeConfig({ auction: { prize: "x".repeat(500) } }).auction.prize.length, 200);
});

test("phiếu và gói quà đấu giá: giữ chuỗi hợp lệ, sai kiểu thì mặc định", () => {
  assert.equal(sanitizeConfig({ bids: "An - 1" }).bids, "An - 1");
  assert.equal(sanitizeConfig({ bids: 1, auction: { prize: null } }).bids, DEFAULT_CONFIG.bids);
  assert.equal(sanitizeConfig({ auction: "x" }).auction.prize, DEFAULT_CONFIG.auction.prize);
});

test("forPlayers: khóa thì bỏ phiếu đấu giá, mở thì giữ nguyên", () => {
  assert.equal(forPlayers({ ...DEFAULT_CONFIG, locked: true }).bids, "");
  assert.equal(forPlayers(DEFAULT_CONFIG).bids, DEFAULT_CONFIG.bids);
});
