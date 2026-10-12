"use client";
import { useState } from "react";
import type { FormState } from "../actions";
import { Message, SubmitButton, useKeepForm, CancelButton } from "@/components/ui";
import { inputCls } from "@/components/styles";
import { RATING_ITEMS, overallRating } from "@/lib/rating";
import { Stars } from "@/components/stars";

export type RatingValues = Record<string, number | string | null | undefined>;

function StarInput({ name, value, onChange, label }: {
  name: string; value: number | null; onChange: (v: number | null) => void; label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      <input type="hidden" name={name} value={value ?? ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`}
          onClick={() => onChange(value === n ? null : n)}
          className={`text-2xl leading-none ${value && n <= value ? "text-amber-500" : "text-slate-300"} hover:text-amber-400`}>
          ★
        </button>
      ))}
      <span className="ml-2 text-xs text-slate-400">{value ? `${value}/5` : "未評価"}</span>
    </div>
  );
}

export function RatingForm({ action, values }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; values: RatingValues;
}) {
  const { state, onSubmit, pending } = useKeepForm(action, {} as FormState);
  const [ratings, setRatings] = useState<Record<string, number | null>>(
    Object.fromEntries(RATING_ITEMS.map((i) => [i.key, (values[`${i.key}_rating`] as number | null) ?? null])),
  );
  const overall = overallRating(RATING_ITEMS.map((i) => ratings[i.key]));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
        <div>
          <p className="text-sm font-medium text-blue-900">総合評価（自動計算）</p>
          <p className="text-xs text-slate-500">5項目の平均を四捨五入。未評価の項目があると確定しません。</p>
        </div>
        <div className="text-2xl"><Stars value={overall} /></div>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
        {RATING_ITEMS.map((i) => (
          <div key={i.key} className="space-y-2 p-4">
            <p className="text-sm font-medium text-slate-700">{i.label}</p>
            <StarInput name={`${i.key}_rating`} label={i.label} value={ratings[i.key]}
              onChange={(v) => setRatings({ ...ratings, [i.key]: v })} />
            <textarea name={`${i.key}_comment`} rows={2} placeholder="評価理由・コメント(任意)"
              defaultValue={(values[`${i.key}_comment`] as string) ?? ""} className={inputCls} />
          </div>
        ))}
      </div>
      <Message error={state.error} success={state.success} />
      <div className="flex gap-2">
        <SubmitButton pending={pending}>保存する</SubmitButton>
        <CancelButton />
      </div>
    </form>
  );
}
