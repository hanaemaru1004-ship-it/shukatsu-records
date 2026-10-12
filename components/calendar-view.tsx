"use client";
import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";
import { EventDialog, type EventDraft } from "@/components/event-dialog";
import { EVENT_TYPES, eventColor } from "@/lib/constants";
import type { CompanyOption, EventRow } from "@/lib/events";
import { addDays, toDateInput } from "@/lib/time";
import { btnPrimary } from "@/components/styles";

type Dialog = { event: EventRow | null; draft?: EventDraft } | null;

export function CalendarView({ events, companies }: { events: EventRow[]; companies: CompanyOption[] }) {
  const [dialog, setDialog] = useState<Dialog>(null);

  const fcEvents = useMemo(() => events.map((e) => {
    const base = {
      id: e.id,
      title: e.company_name ? `${e.company_name} ${e.title}` : e.title,
      color: eventColor(e.event_type),
    };
    if (e.all_day) {
      // FullCalendar の終日イベントの end は排他的なので +1日
      const start = toDateInput(e.starts_at);
      return { ...base, allDay: true, start, end: e.ends_at ? addDays(toDateInput(e.ends_at), 1) : undefined };
    }
    return { ...base, start: e.starts_at, end: e.ends_at ?? undefined };
  }), [events]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">カレンダー</h1>
        <button className={btnPrimary} onClick={() => setDialog({ event: null })}>＋ 予定を追加</button>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
        {EVENT_TYPES.map((t) => (
          <span key={t.name} className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm" style={{ background: t.color }} />{t.name}
          </span>
        ))}
      </div>

      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200 sm:p-4 [&_.fc-toolbar]:flex-wrap [&_.fc-toolbar]:gap-2 [&_.fc-toolbar-title]:text-base sm:[&_.fc-toolbar-title]:text-xl">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locale={jaLocale}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          buttonText={{ today: "今日", month: "月", week: "週", day: "日" }}
          events={fcEvents}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: false }}
          nowIndicator
          eventClick={(info) => {
            const ev = events.find((e) => e.id === info.event.id);
            if (ev) setDialog({ event: ev });
          }}
          dateClick={(info) => {
            // 月表示は終日、週/日表示は時刻つきで新規追加
            setDialog({ event: null, draft: { all_day: info.allDay, starts_at: info.date.toISOString() } });
          }}
        />
      </div>

      {dialog && (
        <EventDialog
          key={dialog.event?.id ?? "new"}
          event={dialog.event}
          draft={dialog.draft}
          companies={companies}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
