export const RATING_ITEMS = [
  { key: "job", label: "仕事内容" },
  { key: "location", label: "勤務地" },
  { key: "salary", label: "給与" },
  { key: "benefits", label: "福利厚生" },
  { key: "wlb", label: "ワークライフバランス" },
] as const;

// 総合評価: 5項目の平均を四捨五入。1つでも未評価なら null（=未評価）。DBトリガーと同じ仕様。
export function overallRating(values: (number | null | undefined)[]): number | null {
  if (values.length !== RATING_ITEMS.length || values.some((v) => !v)) return null;
  const avg = (values as number[]).reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg);
}
