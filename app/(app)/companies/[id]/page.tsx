import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { statusClass } from "@/lib/constants";
import { DeleteButton } from "@/components/delete-button";
import { deleteCompany, updateCompany } from "../actions";
import { CompanyForm } from "../company-form";
import { ResearchForm } from "./research-form";
import { saveResearch } from "./research-actions";
import { ViewEdit } from "@/components/view-edit";
import { CompanyView, RatingView, ResearchView } from "@/components/detail-views";
import { RatingForm } from "./rating-form";
import { saveRating } from "./rating-actions";
import { CompanyEvents } from "@/components/company-events";
import { toEventRow } from "@/lib/events";
import { nowMs } from "@/lib/time";
import { RecordsTab } from "./records/records-tab";

const TABS = [
  { key: "basic", label: "基本情報" },
  { key: "research", label: "企業研究" },
  { key: "rating", label: "志望度" },
  { key: "records", label: "就活記録" },
  { key: "events", label: "日程管理" },
];

// ログイン後の画面はすべてリクエスト時に描画するため、instant 検証の対象外にする
export const instant = false;

export default async function CompanyDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; rtype?: string; rstage?: string; rsort?: string }>;
}) {
  const { id } = await params;
  const { tab = "basic", ...recordFilters } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: company }, { data: inds }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase.from("industries").select("name").order("sort_order"),
  ]);
  if (!company) notFound();

  const current = TABS.find((t) => t.key === tab) ?? TABS[0];

  const [research, refs] = current.key === "research"
    ? await Promise.all([
        supabase.from("company_research").select("*").eq("company_id", id).maybeSingle().then((r) => r.data),
        supabase.from("reference_urls").select("url,title,note").eq("company_id", id).order("sort_order").then((r) => r.data ?? []),
      ])
    : [null, []];

  const rating = current.key === "rating"
    ? (await supabase.from("company_ratings").select("*").eq("company_id", id).maybeSingle()).data
    : null;

  // 保存済みの内容があれば閲覧表示、無ければ最初から入力フォームを表示する
  const filled = (o: Record<string, unknown> | null | undefined, keys?: string[]) =>
    Object.entries(o ?? {}).some(([k, v]) => (!keys || keys.some((p) => k.endsWith(p))) && v !== null && v !== undefined && String(v).trim() !== "");
  const hasResearch = filled(research as Record<string, unknown> | null, ["reason", "attractions", "job_description", "location", "salary", "benefits", "competitors", "strengths", "memo"]) || refs.length > 0;
  const hasRating = filled(rating as Record<string, unknown> | null, ["_rating", "_comment"]);

  const now = nowMs();
  const events = current.key === "events"
    ? ((await supabase.from("events").select("*, companies(name)").eq("company_id", id).order("starts_at")).data ?? []).map(toEventRow)
    : [];

  return (
    <div className="space-y-4">
      <Link href="/companies" className="text-sm text-blue-800 hover:underline">← 企業一覧</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{company.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{company.industry ?? "業種未設定"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(company.status)}`}>{company.status}</span>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <Link key={t.key} href={`/companies/${id}?tab=${t.key}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${current.key === t.key ? "border-blue-800 font-medium text-blue-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {current.key === "basic" ? (
        <div className="space-y-6">
          <ViewEdit view={<CompanyView c={company} />}>
            <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <CompanyForm
                action={updateCompany.bind(null, id)}
                industries={(inds ?? []).map((i) => i.name)}
                values={company}
                submitLabel="保存する"
              />
            </div>
          </ViewEdit>
          <div className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">この企業と、関連する記録・日程をすべて削除します。</p>
            <DeleteButton
              action={deleteCompany.bind(null, id)}
              confirmText={`「${company.name}」を削除しますか？研究・評価・就活記録・日程も一緒に削除され、元に戻せません。`}
              label="企業を削除"
            />
          </div>
        </div>
      ) : current.key === "research" ? (
        <ViewEdit
          startEditing={!hasResearch}
          view={<ResearchView r={research ?? {}} refs={refs} />}
        >
          <ResearchForm action={saveResearch.bind(null, id)} values={research ?? {}} refs={refs} />
        </ViewEdit>
      ) : current.key === "rating" ? (
        <ViewEdit startEditing={!hasRating} view={<RatingView v={rating ?? {}} />}>
          <RatingForm action={saveRating.bind(null, id)} values={rating ?? {}} />
        </ViewEdit>
      ) : current.key === "events" ? (
        <CompanyEvents companyId={id} companyName={company.name} events={events} now={now} />
      ) : current.key === "records" ? (
        <RecordsTab companyId={id} status={company.status} filters={recordFilters} />
      ) : (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          「{current.label}」は次のフェーズで実装予定です。
        </div>
      )}
    </div>
  );
}
