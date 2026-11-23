// Giải mã từ khóa: xáo chữ cái của một từ, người chơi gõ lại từ gốc.
import { cryptoRand, drawIndices, parseEntries, type Rand } from "./random.ts";

export type WordItem = { word: string; hint: string };

// so đáp án không phân biệt hoa thường, dấu, khoảng trắng: "Đoàn kết" == "DOANKET"
export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "D").toUpperCase().replace(/[^A-Z0-9]/g, "");

// mỗi dòng "TỪ KHÓA - gợi ý" (gạch có cách hai bên, hoặc |), thiếu gợi ý cũng được; bỏ từ dưới 2 chữ
export const parseWords = (text: string): WordItem[] =>
  parseEntries(text)
    .map((line) => {
      const m = line.match(/^(.+?)\s+[-–|]\s+(.+)$/) ?? line.match(/^(.+?)\s*\|\s*(.+)$/);
      // NFC: chữ dán từ macOS hay ở dạng NFD (dấu tách rời), xáo sẽ ra ô chỉ có dấu
      const word = (m ? m[1].trim() : line).normalize("NFC");
      return { word, hint: m ? m[2].trim() : "" };
    })
    .filter((w) => normalize(w.word).length >= 2);

// xáo chữ (bỏ khoảng trắng), cố cho khác thứ tự gốc; từ toàn một chữ như "AA" thì đành giữ nguyên
export function scramble(word: string, rand: Rand = cryptoRand) {
  const letters = [...word.toUpperCase().replace(/\s+/g, "")];
  let out = letters;
  for (let t = 0; t < 20; t++) {
    out = drawIndices(letters.length, letters.length, rand).map((i) => letters[i]);
    if (out.join("") !== letters.join("")) break;
  }
  return out;
}
