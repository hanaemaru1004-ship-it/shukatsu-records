import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, STATUSES, eventColor, isDeadline, statusClass } from "@/lib/constants";
import { toEventRow, type EventRow } from "@/lib/events";
import { fmtEvent, nowMs } from "@/lib/time";
import { Stars } from "@/components/stars";

function Card({ title, children, href }: { title: string; children: React.ReactNode; href?: string }) {
  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-blue-900">{title}</h2>
        {href && <Link href={href} className="text-xs text-blue-800 hover:underline">すべて見る</Link>}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="py-3 text-center text-sm text-slate-500">{children}</p>;

function EventItem({ e }: { e: EventRow }) {
  return (
    <li>
      <Link href={e.company_id ? `/companies/${e.company_id}?tab=events` : "/calendar"} className="flex items-center gap-3 rounded-md px-1 py-2 hover:bg-slate-50">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: eventColor(e.event_type) }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{e.company_name ? `${e.company_name} / ` : ""}{e.title}</span>
          <span className="block text-xs text-slate-500">{e.event_type} ・ {fmtEvent(e)}</span>
        </span>
      </Link>
    </li>
  );
}

// ログイン後の画面はすべてリクエスト時に描画するため、instant 検証の対象外にする
export const instant = false;

export default async function Dashboard() {
  const supabase = await createClient();
  const now = nowMs();
  // 終日予定は当日中も「直近」に含めるため、現在から1日前以降を取得して絞り込む
  const since = new Date(now - 24 * 3600 * 1000).toISOString();
  const [{ data: companies }, { data: evs }] = await Promise.all([
    supabase.from("companies").select("id,name,status,updated_at,company_ratings(overall_rating)").order("updated_at", { ascending: false }),
    supabase.from("events").select("*, companies(name)").gte("starts_at", since).order("starts_at").limit(100),
  ]);

  const rows = (companies ?? []).map((c) => {
    const r = Array.isArray(c.company_ratings) ? c.company_ratings[0] : c.company_ratings;
    return { ...c, overall: (r?.overall_rating ?? null) as number | null };
  });
  const upcoming = (evs ?? []).map(toEventRow).filter((e) => (e.all_day ? new Date(e.ends_at ?? e.starts_at).getTime() >= now : new Date(e.starts_at).getTime() >= now));
  const soon = upcoming.slice(0, 6);
  const deadlines = upcoming.filter((e) => isDeadline(e.event_type)).slice(0, 5);
  const statusCounts = STATUSES.map((s) => ({ s, n: rows.filter((r) => r.status === s).length })).filter((x) => x.n > 0);
  const favorites = rows.filter((r) => (r.overall ?? 0) >= 4).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 5);

  const stats = [
    { label: "登録企業数", value: rows.length, tint: "bg-pink-50 text-pink-700", icon: "🏢" },
    { label: "選考中", value: rows.filter((r) => ACTIVE_STATUSES.includes(r.status)).length, tint: "bg-blue-100 text-blue-800", icon: "✏️" },
    { label: "内定", value: rows.filter((r) => r.status === "内定" || r.status === "内定承諾").length, tint: "bg-emerald-50 text-emerald-700", icon: "🎉" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">ダッシュボード</h1>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((c) => (
          <div key={c.label} className={`rounded-2xl p-4 shadow-sm ${c.tint}`}>
            <p className="text-xs leading-tight opacity-80"><span className="block text-base">{c.icon}</span>{c.label}</p>
            <p className="mt-1 text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="直近の予定" href="/calendar">
          {soon.length ? <ul>{soon.map((e) => <EventItem key={e.id} e={e} />)}</ul> : <Empty>直近の予定はありません</Empty>}
        </Card>
        <Card title="ES・WEBテスト・承諾期限などの締切">
          {deadlines.length ? <ul>{deadlines.map((e) => <EventItem key={e.id} e={e} />)}</ul> : <Empty>締切はありません</Empty>}
        </Card>
        <Card title="選考状況" href="/companies">
          {statusCounts.length ? (
            <div className="flex flex-wrap gap-2">
              {statusCounts.map(({ s, n }) => (
                <Link key={s} href={`/companies?status=${encodeURIComponent(s)}`} className={`rounded-full px-3 py-1 text-xs ${statusClass(s)}`}>{s} {n}</Link>
              ))}
            </div>
          ) : <Empty>まだ企業がありません。<Link href="/companies/new" className="text-blue-800 underline">企業を登録</Link></Empty>}
        </Card>
        <Card title="志望度の高い企業" href="/companies?sort=rating">
          {favorites.length ? (
            <ul>{favorites.map((c) => (
              <li key={c.id}><Link href={`/companies/${c.id}?tab=rating`} className="flex items-center justify-between rounded-md px-1 py-2 hover:bg-slate-50">
                <span className="truncate text-sm font-medium">{c.name}</span><Stars value={c.overall} />
              </Link></li>
            ))}</ul>
          ) : <Empty>総合評価が★4以上の企業はまだありません</Empty>}
        </Card>
        <div className="md:col-span-2">
          <Card title="最近更新した企業" href="/companies">
            {rows.length ? (
              <ul className="grid gap-x-4 sm:grid-cols-2">{rows.slice(0, 6).map((c) => (
                <li key={c.id}><Link href={`/companies/${c.id}`} className="flex items-center justify-between gap-2 rounded-md px-1 py-2 hover:bg-slate-50">
                  <span className="truncate text-sm font-medium">{c.name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusClass(c.status)}`}>{c.status}</span>
                </Link></li>
              ))}</ul>
            ) : <Empty>まだ企業がありません</Empty>}
          </Card>
        </div>
      </div>
    </div>
  );
}
