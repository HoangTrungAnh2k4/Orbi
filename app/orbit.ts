// Mỗi danh mục là một vòng quỹ đạo, tool cùng danh mục chia đều trên vòng.
// Chu kỳ quay theo Kepler (T ∝ r^1.5), góc xuất phát lệch nhau theo góc vàng cho khỏi thẳng hàng.
export function layout<T extends { category: string }>(tools: T[], rIn = 92, rOut = 176) {
  const cats = [...new Set(tools.map((t) => t.category))];
  return cats.map((category, i) => {
    const r = cats.length < 2 ? (rIn + rOut) / 2 : rIn + (i * (rOut - rIn)) / (cats.length - 1);
    const items = tools.filter((t) => t.category === category);
    return {
      category, r,
      dur: Math.round(40 * (r / rIn) ** 1.5),
      start: (i * 137.5 + 210) % 360,
      planets: items.map((t, j) => ({ ...t, angle: (j * 360) / items.length })),
    };
  });
}
