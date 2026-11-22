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

// đoạn văn tự viết, gõ theo thứ tự; hết đoạn thì nối sang đoạn kế
const TEXTS: Record<Lang, string[]> = {
  en: [
    "The morning train was late again, so she opened her notebook and started to write. Small ideas came first, then a plan for the weekend, then a list of people she wanted to call. By the time the doors opened, the page was full.",
    "A good habit is quiet. It does not ask for attention or praise. It shows up every day, does a little work, and leaves. After a year you look back and wonder how so much changed while nothing seemed to happen at all.",
    "The old bridge over the river had seen more storms than anyone in the village could remember. Children ran across it to school, farmers pushed carts to the market, and at night the lamps along its rail made the water shine like gold.",
    "Learning to type fast is mostly about staying calm. Look at the screen, not your hands, and keep a steady rhythm. Speed comes later, almost by accident, once your fingers stop thinking and simply know where every key lives.",
    "We packed the car before sunrise, with coffee, maps, and far too many snacks. The road climbed slowly into the hills, the radio lost its signal, and for a few hours the only sound was the wind and our own laughter.",
  ],
  vi: [
    "Sáng nay trời mưa nhẹ, phố xá vắng hơn mọi ngày. Tôi ngồi bên cửa sổ, nhâm nhi ly cà phê nóng và nghe tiếng mưa rơi trên mái tôn. Những lúc như vậy, mọi lo toan dường như chậm lại một chút.",
    "Học gõ phím nhanh không khó như nhiều người nghĩ. Điều quan trọng là giữ nhịp đều, mắt nhìn màn hình thay vì nhìn tay. Sau vài tuần luyện tập, các ngón tay sẽ tự nhớ vị trí của từng phím.",
    "Quê tôi có một con sông nhỏ chảy qua giữa làng. Mùa hè, lũ trẻ rủ nhau ra bến tắm, tiếng cười vang cả một khúc sông. Chiều về, mấy chiếc thuyền chở lúa lặng lẽ trôi qua dưới ánh hoàng hôn.",
    "Một thói quen tốt thường rất lặng lẽ. Nó không cần ai khen, cũng chẳng đòi hỏi gì nhiều. Mỗi ngày làm một chút, đều đặn và kiên nhẫn, rồi một năm sau nhìn lại, bạn sẽ bất ngờ vì mình đã đi xa đến vậy.",
    "Tối thứ bảy, cả nhà quây quần bên mâm cơm. Mẹ nấu canh chua, bố kể chuyện hồi còn đi học, còn em út thì tranh phần miếng cá to nhất. Những bữa cơm như thế giản dị mà ấm áp vô cùng.",
  ],
};
// bắt đầu từ một đoạn ngẫu nhiên, nối vòng sang các đoạn sau cho tới khi đủ n từ
export const textWords = (n: number, lang: Lang, rand = Math.random) => {
  const t = TEXTS[lang];
  const out: string[] = [];
  for (let i = Math.floor(rand() * t.length); out.length < n; i++) out.push(...t[i % t.length].split(" "));
  return out.slice(0, n);
};
