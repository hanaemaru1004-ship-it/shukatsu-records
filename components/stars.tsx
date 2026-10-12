export function Stars({ value }: { value: number | null | undefined }) {
  if (!value) return <span className="text-xs text-slate-400">未評価</span>;
  return (
    <span aria-label={`総合評価 ${value} / 5`} className="whitespace-nowrap text-amber-500">
      {"★".repeat(value)}<span className="text-slate-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}
