import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, statusClass } from "@/lib/constants";
import { fmtEvent, nowMs } from "@/lib/time";
import { Stars } from "@/components/stars";
import { btnPrimary, btnSecondary, inputCls } from "@/components/styles";

type SP = { q?: string; industry?: string; status?: string; sort?: string };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

// ログイン後の画面はすべてリクエスト時に描画するため、instant 検証の対象外にする
export const instant = false;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { q = "", industry = "", status = "", sort = "updated" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("id,name,industry,status,created_at,updated_at,company_ratings(overall_rating),events(title,starts_at,ends_at,all_day)");
  if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`);
  if (industry) query = query.eq("industry", industry);
  if (status) query = query.eq("status", status);
  query = query.order(sort === "created" ? "created_at" : "updated_at", { ascending: false });

  const [{ data, error }, { data: inds }] = await Promise.all([
    query,
    supabase.from("industries").select("name").order("sort_order"),
  ]);

  const now = nowMs();
  let rows = (data ?? []).map((c) => {
    const rating = Array.isArray(c.company_ratings) ? c.company_ratings[0] : c.company_ratings;
    const next = (c.events ?? [])
      .filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    return { ...c, overall: (rating?.overall_rating ?? null) as number | null, next };
  });
  if (sort === "rating") rows = rows.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

  const hasFilter = q || industry || status;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">企業一覧</h1>
        <Link href="/companies/new" className={btnPrimary}>＋ 企業を登録</Link>
      </div>

      <form className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 md:grid-cols-5">
        <input name="q" defaultValue={q} placeholder="企業名で検索" className={`${inputCls} col-span-2 md:col-span-1`} />
        <select name="industry" defaultValue={industry} className={inputCls} aria-label="業種">
          <option value="">業種: すべて</option>
          {(inds ?? []).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
        </select>
        <select name="status" defaultValue={status} className={inputCls} aria-label="選考ステータス">
          <option value="">ステータス: すべて</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className={inputCls} aria-label="並べ替え">
          <option value="updated">更新日が新しい順</option>
          <option value="created">登録日が新しい順</option>
          <option value="rating">志望度が高い順</option>
        </select>
        <div className="flex gap-2">
          <button className={`${btnPrimary} flex-1`}>絞り込む</button>
          {hasFilter && <Link href="/companies" className={btnSecondary}>解除</Link>}
        </div>
      </form>

      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">読み込みに失敗しました: {error.message}</p>}

      {rows.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-slate-200">
          <p className="text-slate-600">{hasFilter ? "条件に一致する企業がありません" : "まだ企業が登録されていません"}</p>
          {!hasFilter && <Link href="/companies/new" className={`${btnPrimary} mt-4`}>最初の企業を登録する</Link>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/companies/${c.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-blue-900">{c.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(c.status)}`}>{c.status}</span>
                  <Stars value={c.overall} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  <span>{c.industry ?? "業種未設定"}</span>
                  <span>次回: {c.next ? `${fmtEvent(c.next)} ${c.next.title}` : "予定なし"}</span>
                  <span>更新: {fmt(c.updated_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
