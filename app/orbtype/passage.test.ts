import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPassage, textWords } from "./passage.ts";

test("cleanPassage: bỏ ký tự khó gõ, giữ dấu câu cơ bản và dấu tiếng Việt", () => {
  assert.deepEqual(cleanPassage("“Chào” bạn — hôm nay\ntrời đẹp… (thật) it’s 2 giờ!"),
    ["Chào", "bạn", "hôm", "nay", "trời", "đẹp", "thật", "it's", "2", "giờ!"]);
});

test("cleanPassage: gộp chữ tổ hợp về NFC", () => {
  assert.equal(cleanPassage("việt")[0], "việt");
});

test("textWords: đủ n từ, hết đoạn thì nối vòng sang đoạn kế", () => {
  const a = textWords(500, "vi", () => 0.99); // bắt đầu từ đoạn cuối
  assert.equal(a.length, 500);
  assert.equal(a[0], "Tối"); // đoạn cuối mở đầu bằng "Tối thứ bảy"
  assert.equal(a[a.indexOf("cùng.") + 1], "Sáng"); // hết đoạn cuối thì quay về đoạn đầu
});
