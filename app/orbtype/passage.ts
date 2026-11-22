export type Lang = "vi" | "en";

const TOPICS = ["cooking", "travel", "rain", "childhood", "technology", "the sea", "a market", "music", "friendship", "sports",
  "a forest", "city life", "books", "space", "animals", "coffee", "history", "school", "a weekend", "gardening"];

export const passagePrompt = (lang: Lang, n: number) =>
  `Write one natural, coherent paragraph in ${lang === "vi" ? "Vietnamese (with full diacritics)" : "English"} ` +
  `of about ${n} words${lang === "vi" ? " (count each syllable as one word)" : ""}, about ${TOPICS[Math.floor(Math.random() * TOPICS.length)]}. ` +
  "Use everyday vocabulary. Output only the paragraph: no title, no lists, no quotes, no line breaks, only the punctuation . , ? !";

// chỉ giữ chữ, số và dấu câu gõ được trên bàn phím thường; bỏ "từ" chỉ còn dấu câu
export const cleanPassage = (raw: string) =>
  raw.normalize("NFC").replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}\s.,!?'-]/gu, " ")
    .split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
