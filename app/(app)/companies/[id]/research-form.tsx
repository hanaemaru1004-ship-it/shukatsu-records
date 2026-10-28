"use client";
import { useState } from "react";
import type { FormState } from "../actions";
import { Field, Message, SubmitButton, useKeepForm, CancelButton } from "@/components/ui";
import { btnSecondary, inputCls } from "@/components/styles";

export type ResearchValues = Partial<Record<
  "reason" | "attractions" | "job_description" | "location" | "starting_salary" | "average_salary" |
  "average_age" | "benefits" | "strengths" | "memo", string | null>>;
export type RefUrl = { url: string; title: string | null; note: string | null };

const area = (name: string, label: string, v: ResearchValues, rows = 3) => (
  <Field label={label}>
    <textarea name={name} rows={rows} defaultValue={v[name as keyof ResearchValues] ?? ""} className={inputCls} />
  </Field>
);

export function ResearchForm({ action, values, refs }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  values: ResearchValues; refs: RefUrl[];
}) {
  const { state, onSubmit, pending } = useKeepForm(action, {} as FormState);
  // key で行を識別（途中の行を削除しても入力値がずれないように）
  const [rows, setRows] = useState(() => refs.map((r, i) => ({ key: i, ...r })));
  const [nextKey, setNextKey] = useState(refs.length);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        {area("reason", "事業内容", values, 4)}
        {area("attractions", "注目の事業", values)}
        {area("job_description", "仕事内容", values, 4)}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="初任給"><input name="starting_salary" defaultValue={values.starting_salary ?? ""} className={inputCls} placeholder="例: 月給25万円" /></Field>
          <Field label="平均年収"><input name="average_salary" defaultValue={values.average_salary ?? ""} className={inputCls} placeholder="例: 650万円" /></Field>
          <Field label="平均年齢"><input name="average_age" defaultValue={values.average_age ?? ""} className={inputCls} placeholder="例: 35.2歳" /></Field>
        </div>
        {area("location", "勤務地", values, 2)}
        {area("benefits", "福利厚生", values)}
        {area("strengths", "他社と比較したときの強み", values)}
        <div className="space-y-3">
          <span className="block text-sm font-medium text-slate-700">参考URL</span>
          {rows.length === 0 && <p className="text-sm text-slate-500">参考URLはまだありません。</p>}
          {rows.map((r) => (
            <div key={r.key} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex gap-2">
                <input name="ref_url" type="url" defaultValue={r.url} placeholder="https://" aria-label="URL" className={inputCls} />
                <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                  className="shrink-0 rounded-md border border-rose-300 px-3 text-sm text-rose-700 hover:bg-rose-50">削除</button>
              </div>
              <input name="ref_title" defaultValue={r.title ?? ""} placeholder="タイトル(任意)" aria-label="タイトル" className={inputCls} />
              <input name="ref_note" defaultValue={r.note ?? ""} placeholder="補足メモ(任意)" aria-label="補足メモ" className={inputCls} />
              {r.url && /^https?:\/\//i.test(r.url) && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-blue-800 underline">
                  {r.title || r.url} を別タブで開く
                </a>
              )}
            </div>
          ))}
          <button type="button" className={btnSecondary}
            onClick={() => { setRows([...rows, { key: nextKey, url: "", title: null, note: null }]); setNextKey(nextKey + 1); }}>
            ＋ URLを追加
          </button>
        </div>
        {area("memo", "その他", values, 4)}
      </section>

      <Message error={state.error} success={state.success} />
      <div className="flex gap-2">
        <SubmitButton pending={pending}>保存する</SubmitButton>
        <CancelButton />
      </div>
    </form>
  );
}
