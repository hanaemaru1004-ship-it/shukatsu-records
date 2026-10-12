"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent, saveEvent } from "@/app/(app)/events-actions";
import { Field, Message, SubmitButton, useKeepForm } from "@/components/ui";
import { btnSecondary, inputCls } from "@/components/styles";
import { EVENT_TYPES, eventColor, inferEventType } from "@/lib/constants";
import type { CompanyOption, EventRow } from "@/lib/events";
import { fmtEvent, toDateInput, toDateTimeInput } from "@/lib/time";

export type EventDraft = { starts_at?: string; all_day?: boolean; company_id?: string | null };

/** 予定の詳細表示 + 追加/編集フォーム（企業詳細とカレンダーで共通） */
export function EventDialog({ event, draft, companies, onClose }: {
  event: EventRow | null; draft?: EventDraft; companies: CompanyOption[]; onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">(event ? "view" : "edit");
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, startDelete] = useTransition();
  const { state, onSubmit, pending } = useKeepForm(saveEvent.bind(null, event?.id ?? null), {});
  const handled = useRef<number>(undefined);

  useEffect(() => {
    if (state.at && handled.current !== state.at) {
      handled.current = state.at;
      router.refresh();
      onClose();
    }
  }, [state.at, router, onClose]);

  // 予定タイトルは選択式（種類名の候補＋自由入力）。候補を選ぶと種類も自動で合わせる。自由入力は文言から種類を推測
  const CUSTOM = "__custom__";
  const presets: string[] = EVENT_TYPES.map((t) => t.name);
  const [titleChoice, setTitleChoice] = useState(event ? (presets.includes(event.title) ? event.title : CUSTOM) : "");
  const [customTitle, setCustomTitle] = useState(event && !presets.includes(event.title) ? event.title : "");
  const [eventType, setEventType] = useState(event?.event_type ?? "その他");
  const finalTitle = titleChoice === CUSTOM ? customTitle : titleChoice;

  const initialAllDay = event?.all_day ?? draft?.all_day ?? false;
  const [allDay, setAllDay] = useState(initialAllDay);
  const conv = (iso: string | null | undefined, ad: boolean) => (iso ? (ad ? toDateInput(iso) : toDateTimeInput(iso)) : "");
  const [start, setStart] = useState(conv(event?.starts_at ?? draft?.starts_at, initialAllDay));
  const [end, setEnd] = useState(conv(event?.ends_at, initialAllDay));
  // 終日↔時刻の切り替え時は、入力済みの日付を保ったまま形式だけ変える
  const toggleAllDay = (ad: boolean) => {
    setAllDay(ad);
    const fix = (v: string) => (ad ? v.slice(0, 10) : v.length === 10 ? `${v}T09:00` : v);
    setStart(fix(start));
    setEnd(fix(end));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        {mode === "view" && event ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block rounded-full px-2 py-0.5 text-xs text-white" style={{ background: eventColor(event.event_type) }}>{event.event_type}</span>
                <h2 className="mt-1 text-lg font-bold">{event.title}</h2>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="閉じる">✕</button>
            </div>
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-slate-500">日時: </dt><dd className="inline">{fmtEvent(event)}{event.ends_at && ` 〜 ${fmtEvent({ starts_at: event.ends_at, all_day: event.all_day })}`}{event.all_day && "(終日)"}</dd></div>
              {event.company_id && <div><dt className="inline text-slate-500">企業: </dt><dd className="inline"><a className="text-blue-800 underline" href={`/companies/${event.company_id}`}>{event.company_name}</a></dd></div>}
              {event.location && <div><dt className="inline text-slate-500">場所: </dt><dd className="inline">{event.location}</dd></div>}
              {event.meeting_url && <div><dt className="inline text-slate-500">参加URL: </dt><dd className="inline"><a className="break-all text-blue-800 underline" href={event.meeting_url} target="_blank" rel="noopener noreferrer">{event.meeting_url}</a></dd></div>}
              {event.memo && <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{event.memo}</div>}
            </dl>
            <Message error={deleteError} />
            <div className="flex justify-between gap-2 pt-2">
              <button type="button" disabled={deleting} className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                onClick={() => {
                  if (!confirm(`「${event.title}」を削除しますか？`)) return;
                  startDelete(async () => {
                    const r = await deleteEvent(event.id, event.company_id);
                    if (r.error) setDeleteError(r.error);
                    else { router.refresh(); onClose(); }
                  });
                }}>{deleting ? "削除中…" : "削除"}</button>
              <div className="flex gap-2">
                <button type="button" className={btnSecondary} onClick={onClose}>閉じる</button>
                <button type="button" className={btnSecondary} onClick={() => setMode("edit")}>編集</button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{event ? "予定を編集" : "予定を追加"}</h2>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="閉じる">✕</button>
            </div>
            <Field label="予定タイトル" required>
              <select value={titleChoice} required className={inputCls}
                onChange={(e) => {
                  setTitleChoice(e.target.value);
                  if (presets.includes(e.target.value)) setEventType(e.target.value);
                }}>
                <option value="" disabled>選択してください</option>
                {presets.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value={CUSTOM}>自由入力…</option>
              </select>
            </Field>
            {titleChoice === CUSTOM && (
              <Field label="タイトルを入力" required>
                <input required maxLength={100} value={customTitle} className={inputCls}
                  onChange={(e) => {
                    setCustomTitle(e.target.value);
                    const guessed = inferEventType(e.target.value);
                    if (guessed) setEventType(guessed);
                  }} />
              </Field>
            )}
            <input type="hidden" name="title" value={finalTitle} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="企業">
                <select name="company_id" defaultValue={event?.company_id ?? draft?.company_id ?? ""} className={inputCls}>
                  <option value="">指定なし</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="予定の種類(カレンダーの色)" required>
                <span className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                  <span className="inline-block size-3 rounded-sm" style={{ background: eventColor(eventType) }} />{eventType}
                </span>
                <select name="event_type" value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputCls}>
                  {EVENT_TYPES.map((t) => <option key={t.name}>{t.name}</option>)}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="all_day" checked={allDay} onChange={(e) => toggleAllDay(e.target.checked)} /> 終日
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="開始日時" required>
                <input name="starts_at" type={allDay ? "date" : "datetime-local"} required value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </Field>
              <Field label="終了日時" hint="締切など、日時だけの予定は空欄でOK">
                <input name="ends_at" type={allDay ? "date" : "datetime-local"} value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="場所・オンライン開催情報"><input name="location" defaultValue={event?.location ?? ""} className={inputCls} /></Field>
            <Field label="参加URL"><input name="meeting_url" type="url" placeholder="https://" defaultValue={event?.meeting_url ?? ""} className={inputCls} /></Field>
            <Field label="メモ"><textarea name="memo" rows={3} defaultValue={event?.memo ?? ""} className={inputCls} /></Field>
            <Message error={state.error} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={event ? () => setMode("view") : onClose}>キャンセル</button>
              <SubmitButton pending={pending}>保存する</SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
