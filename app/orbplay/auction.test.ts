import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBids, resolveAuction } from "./auction.ts";

test("parseBids: nhận nhiều kiểu ngăn cách, bỏ dòng sai", () => {
  const { bids, invalid } = parseBids("An - 3\nBình, 1\nChi:2\nDũng\t007\nNguyễn Văn E 5\nHọ tên, Số\nGiang -5\nHà 0\nKhoa 1.5\nLam 1234567890123456\n\n");
  assert.deepEqual(bids, [
    { name: "An", value: 3 },
    { name: "Bình", value: 1 },
    { name: "Chi", value: 2 },
    { name: "Dũng", value: 7 },
    { name: "Nguyễn Văn E", value: 5 },
  ]);
  assert.deepEqual(invalid, ["Họ tên, Số", "Giang -5", "Hà 0", "Khoa 1.5", "Lam 1234567890123456"]);
});

test("parseBids: cùng tên (không phân biệt hoa thường) thì lấy lần nộp cuối và báo tên bị đè", () => {
  const r = parseBids("An 3\nBình 4\nan 9");
  assert.deepEqual(r.bids, [{ name: "Bình", value: 4 }, { name: "an", value: 9 }]);
  assert.deepEqual(r.replaced, ["an"]);
});

test("parseBids: dán sheet kết quả form thì bỏ cột thời gian, email", () => {
  const r = parseBids("Dấu thời gian\tHọ tên\tSố\n23/11/2026 10:00:00\tAn\t5\n23/11/2026 10:05:00\ta@x.vn\tBình\t2\n23/11/2026 10:09:00\tAn\t3\n23/11/2026,Chi,4");
  assert.deepEqual(r.bids, [{ name: "Bình", value: 2 }, { name: "An", value: 3 }, { name: "Chi", value: 4 }]);
  assert.deepEqual(r.invalid, ["Dấu thời gian\tHọ tên\tSố"]);
  assert.deepEqual(r.replaced, ["An"]);
});

test("resolveAuction: số nhỏ nhất không trùng thắng", () => {
  const { groups, winner } = resolveAuction(parseBids("A 1\nB 1\nC 2\nD 2\nE 7\nF 3\nG 3\nH 5").bids);
  assert.deepEqual(groups.map((g) => g.value), [1, 2, 3, 5]); // 7 > số thắng nên bị cắt
  assert.equal(winner, 3);
  assert.deepEqual(groups[winner].names, ["H"]);
});

test("resolveAuction: trùng hết hoặc rỗng thì không ai thắng", () => {
  assert.equal(resolveAuction(parseBids("A 1\nB 1\nC 2\nD 2").bids).winner, -1);
  assert.deepEqual(resolveAuction([]), { groups: [], winner: -1, count: 0 });
});
