import { Stars } from "@/components/stars";
import { RATING_ITEMS, overallRating } from "@/lib/rating";

// 保存済みの内容を読み取り専用で表示する（企業詳細の各タブの「閲覧」表示）

const card = "rounded-xl bg-white p-5 ring-1 ring-slate-200";

function Row({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  const v = value?.trim();
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-800">
        {!v ? <span className="text-slate-400">未入力</span> : link && /^https?:\/\//i.test(v)
          ? <a href={v} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">{v}</a>
          : v}
      </dd>
    </div>
  );
}

export type CompanyData = {
  entry_date: string; name: string; industry: string | null; employee_count: string | null; headquarters: string | null;
  capital: string | null; business_description: string | null; website_url: string | null; memo: string | null;
};

export function CompanyView({ c }: { c: CompanyData }) {
  return (
    <dl className={`${card} space-y-4`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="企業名" value={c.name} />
        <Row label="記入日" value={c.entry_date} />
        <Row label="業種" value={c.industry} />
        <Row label="従業員数" value={c.employee_count} />
        <Row label="本店所在地" value={c.headquarters} />
        <Row label="資本金" value={c.capital} />
      </div>
      <Row label="企業公式サイトURL" value={c.website_url} link />
      <Row label="事業内容" value={c.business_description} />
      <Row label="その他メモ" value={c.memo} />
    </dl>
  );
}

export type ResearchData = Partial<Record<
  "reason" | "attractions" | "job_description" | "location" | "starting_salary" | "average_salary" |
  "salary_other" | "benefits" | "competitors" | "strengths" | "memo", string | null>>;

export function ResearchView({ r, refs }: { r: ResearchData; refs: { url: string; title: string | null; note: string | null }[] }) {
  return (
    <div className="space-y-4">
      <dl className={`${card} space-y-4`}>
        <h2 className="font-bold text-blue-900">企業への関心</h2>
        <Row label="気になった理由" value={r.reason} />
        <Row label="企業の魅力" value={r.attractions} />
      </dl>
      <dl className={`${card} space-y-4`}>
        <h2 className="font-bold text-blue-900">仕事・条件</h2>
        <Row label="仕事内容" value={r.job_description} />
        <Row label="勤務地" value={r.location} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="初任給" value={r.starting_salary} />
          <Row label="平均年収" value={r.average_salary} />
        </div>
        <Row label="その他給与に関する情報" value={r.salary_other} />
        <Row label="福利厚生" value={r.benefits} />
      </dl>
      <dl className={`${card} space-y-4`}>
        <h2 className="font-bold text-blue-900">他社との比較</h2>
        <Row label="競合企業" value={r.competitors} />
        <Row label="他社と比較したときの強み" value={r.strengths} />
      </dl>
      <div className={`${card} space-y-3`}>
        <h2 className="font-bold text-blue-900">参考URL</h2>
        {refs.length === 0 ? <p className="text-sm text-slate-400">登録されていません</p> : (
          <ul className="space-y-2">
            {refs.map((u, i) => (
              <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                <a href={u.url} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-blue-800 underline">{u.title || u.url}</a>
                {u.title && <p className="break-all text-xs text-slate-500">{u.url}</p>}
                {u.note && <p className="mt-1 whitespace-pre-wrap text-slate-700">{u.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <dl className={card}><Row label="その他メモ" value={r.memo} /></dl>
    </div>
  );
}

export function RatingView({ v }: { v: Record<string, number | string | null | undefined> }) {
  const overall = overallRating(RATING_ITEMS.map((i) => (v[`${i.key}_rating`] as number | null) ?? null));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
        <div>
          <p className="text-sm font-medium text-blue-900">総合評価（自動計算）</p>
          <p className="text-xs text-slate-500">5項目の平均を四捨五入。未評価の項目があると確定しません。</p>
        </div>
        <div className="text-2xl"><Stars value={overall} /></div>
      </div>
      <div className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
        {RATING_ITEMS.map((i) => {
          const comment = (v[`${i.key}_comment`] as string | null)?.trim();
          return (
            <div key={i.key} className="space-y-1 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{i.label}</p>
                <span className="text-xl"><Stars value={(v[`${i.key}_rating`] as number | null) ?? null} /></span>
              </div>
              {comment && <p className="whitespace-pre-wrap text-sm text-slate-600">{comment}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
