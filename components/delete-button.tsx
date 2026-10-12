"use client";
import { useTransition } from "react";

export function DeleteButton({ action, confirmText, label = "削除" }: {
  action: () => Promise<void>; confirmText: string; label?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending}
      onClick={() => { if (confirm(confirmText)) start(() => action()); }}
      className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60">
      {pending ? "削除中…" : label}
    </button>
  );
}
