"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, type FormEvent } from "react";

import { btnPrimary, btnSecondary } from "@/components/styles";

/** 閲覧⇄編集の切り替え（ViewEdit）の中にあるフォームが、保存完了・キャンセルを伝えるためのもの */
export const EditContext = createContext<{ done: () => void; cancel?: () => void } | null>(null);

export function CancelButton() {
  const ctx = useContext(EditContext);
  if (!ctx?.cancel) return null;
  return <button type="button" onClick={ctx.cancel} className={btnSecondary}>キャンセル</button>;
}

/**
 * Server Action 用のフォーム状態。<form action={fn}> は実行後に入力欄を初期値へリセットしてしまい、
 * バリデーションエラー時に入力内容が消えるため、onSubmit 経由で実行してリセットを避ける。
 */
type ActionResult = { error?: string; success?: string; at?: number };
export function useKeepForm(action: (state: ActionResult, formData: FormData) => Promise<ActionResult>, initial: ActionResult = {}) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const ctx = useContext(EditContext);
  // 保存に成功したら閲覧表示へ戻す（state は実行のたびに新しいオブジェクトになる）
  useEffect(() => {
    if (state.success) ctx?.done();
  }, [state, ctx]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}

export function SubmitButton({ children, pending = false, pendingText = "保存中…", className = btnPrimary }: {
  children: React.ReactNode; pending?: boolean; pendingText?: string; className?: string;
}) {
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

export function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Message({ error, success }: { error?: string; success?: string }) {
  if (error) return <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>;
  if (success) return <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>;
  return null;
}
