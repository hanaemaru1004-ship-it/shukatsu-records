"use client";
import { useState } from "react";
import type { FormState } from "../../actions";
import { Field, Message, SubmitButton, useKeepForm } from "@/components/ui";
import { btnSecondary, inputCls } from "@/components/styles";

export type RecordValues = {
  title?: string; record_date?: string; record_type?: string; stage?: string | null;
  intern_impression?: string | null; intern_reflection?: string | null;
  interview_reflection?: string | null; gd_reflection?: string | null; memo?: string | null;
};
export type Item = { kind: "es" | "interview"; question: string; answer: string };

function ItemList({ kind, items, setItems, qLabel, aLabel, addLabel }: {
  kind: Item["kind"]; items: (Item & { key: number })[]; setItems: (f: (prev: (Item & { key: number })[]) => (Item & { key: number })[]) => void;
  qLabel: string; aLabel: string; addLabel: string;
}) {
  const mine = items.filter((i) => i.kind === kind);
  return (
    <div className="space-y-3">
      {mine.length === 0 && <p className="text-sm text-slate-500">まだありません。</p>}
      {mine.map((it, idx) => (
        <div key={it.key} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{idx + 1}</span>
            <button type="button" onClick={() => setItems((p) => p.filter((x) => x.key !== it.key))}
              className="text-xs text-rose-700 hover:underline">削除</button>
          </div>
          <input type="hidden" name="item_kind" value={kind} />
          <Field label={qLabel}><textarea name="item_q" rows={2} defaultValue={it.question} className={inputCls} /></Field>
          <Field label={aLabel}><textarea name="item_a" rows={4} defaultValue={it.answer} className={inputCls} /></Field>
        </div>
      ))}
      <button type="button" className={btnSecondary}
        onClick={() => setItems((p) => [...p, { key: Math.max(-1, ...p.map((x) => x.key)) + 1, kind, question: "", answer: "" }])}>
        ＋ {addLabel}
      </button>
    </div>
  );
}

export function RecordForm({ action, values = {}, initialItems = [], submitLabel }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  values?: RecordValues; initialItems?: Item[]; submitLabel: string;
}) {
  const { state, onSubmit, pending } = useKeepForm(action, {} as FormState);
  const [items, setItems] = useState(() => initialItems.map((it, i) => ({ ...it, key: i })));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* タイトル・記録日・種類・段階は入力させない。新規は保存時に自動設定、編集時は既存の値を保持 */}
      {values.title && (
        <>
          <input type="hidden" name="title" value={values.title} />
          <input type="hidden" name="record_date" value={values.record_date ?? ""} />
          <input type="hidden" name="record_type" value={values.record_type ?? ""} />
          <input type="hidden" name="stage" value={values.stage ?? ""} />
        </>
      )}

      <div className="space-y-6 rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-base font-bold text-blue-900">記録内容</h2>
      <section className="space-y-3">
        <h2 className="font-bold text-blue-900">ESで書いた内容</h2>
        <ItemList kind="es" items={items} setItems={setItems} qLabel="設問" aLabel="書いた内容" addLabel="設問を追加" />
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="font-bold text-blue-900">面接の質問と回答</h2>
        <ItemList kind="interview" items={items} setItems={setItems} qLabel="聞かれた質問" aLabel="自分の回答" addLabel="質問を追加" />
        <Field label="面接後の反省"><textarea name="interview_reflection" rows={4} defaultValue={values.interview_reflection ?? ""} className={inputCls} /></Field>
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-6">
        <h2 className="font-bold text-blue-900">インターンシップの感想と反省</h2>
        <Field label="参加した感想"><textarea name="intern_impression" rows={4} defaultValue={values.intern_impression ?? ""} className={inputCls} /></Field>
        <Field label="反省"><textarea name="intern_reflection" rows={4} defaultValue={values.intern_reflection ?? ""} className={inputCls} /></Field>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="mb-3 font-bold text-blue-900">グループディスカッションの反省</h2>
        <Field label="反省"><textarea name="gd_reflection" rows={4} defaultValue={values.gd_reflection ?? ""} className={inputCls} /></Field>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="mb-3 font-bold text-blue-900">その他メモ</h2>
        <Field label="メモ"><textarea name="memo" rows={4} defaultValue={values.memo ?? ""} className={inputCls} /></Field>
      </section>
      </div>

      <Message error={state.error} success={state.success} />
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}
