import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPassage } from "./passage.ts";

test("cleanPassage: bỏ ký tự khó gõ, giữ dấu câu cơ bản và dấu tiếng Việt", () => {
  assert.deepEqual(cleanPassage("“Chào” bạn — hôm nay\ntrời đẹp… (thật) it’s 2 giờ!"),
    ["Chào", "bạn", "hôm", "nay", "trời", "đẹp", "thật", "it's", "2", "giờ!"]);
});

test("cleanPassage: gộp chữ tổ hợp về NFC", () => {
  assert.equal(cleanPassage("việt")[0], "việt");
});
