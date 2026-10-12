"use client";
import { startTransition, useActionState, type FormEvent } from "react";

import { btnPrimary } from "@/components/styles";

/**
 * Server Action 用のフォーム状態。<form action={fn}> は実行後に入力欄を初期値へリセットしてしまい、
 * バリデーションエラー時に入力内容が消えるため、onSubmit 経由で実行してリセットを避ける。
 */
type ActionResult = { error?: string; success?: string; at?: number };
export function useKeepForm(action: (state: ActionResult, formData: FormData) => Promise<ActionResult>, initial: ActionResult = {}) {
  const [state, dispatch, pending] = useActionState(action, initial);
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
