"use client";
import { useState } from "react";
import { EventDialog } from "@/components/event-dialog";
import { btnPrimary } from "@/components/styles";
import { eventColor } from "@/lib/constants";
import type { EventRow } from "@/lib/events";
import { fmtEvent } from "@/lib/time";

/** 企業詳細の「日程管理」タブ。カレンダーと同じ events テーブルを参照する。 */
export function CompanyEvents({ companyId, companyName, events, now }: {
  companyId: string; companyName: string; events: EventRow[]; now: number;
}) {
  const [dialog, setDialog] = useState<{ event: EventRow | null } | null>(null);
  const upcoming = events.filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now);
  const past = events.filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() < now).reverse();

  const list = (rows: EventRow[]) => (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      {rows.map((e) => (
        <li key={e.id}>
          <button type="button" onClick={() => setDialog({ event: e })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: eventColor(e.event_type) }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{e.title}</span>
              <span className="block text-xs text-slate-500">{e.event_type} ・ {fmtEvent(e)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">ここで登録した予定はカレンダーにも表示されます。</p>
        <button className={btnPrimary} onClick={() => setDialog({ event: null })}>＋ 予定を追加</button>
      </div>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-blue-900">これからの予定</h2>
        {upcoming.length ? list(upcoming) : <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">予定はありません</p>}
      </section>
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-600">過去の予定</h2>
          {list(past)}
        </section>
      )}
      {dialog && (
        <EventDialog
          key={dialog.event?.id ?? "new"}
          event={dialog.event}
          draft={{ company_id: companyId }}
          companies={[{ id: companyId, name: companyName }]}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
