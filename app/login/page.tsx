"use client";
import { useState } from "react";
import { login, signup } from "./actions";
import { Field, Message, SubmitButton, useKeepForm } from "@/components/ui";
import { btnPrimary, inputCls } from "@/components/styles";

// ログインと登録は別コンポーネントにする（モード切替でアクションが入れ替わらないように、フックを分離）
function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { state, onSubmit, pending } = useKeepForm(mode === "login" ? login : signup);
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="ユーザー名" required hint="好きな文字で入力できます(ひらがな・漢字・記号もOK)">
        <input name="username" autoComplete="username" required className={inputCls} />
      </Field>
      <Field label="パスワード" required hint={mode === "signup" ? "8文字以上で、英大文字・英小文字・数字・記号のうち2種類以上を含めてください" : undefined}>
        <input name="password" type="password" minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "login" ? "current-password" : "new-password"} required className={inputCls} />
      </Field>
      <Message error={state.error} />
      <SubmitButton pending={pending} className={`${btnPrimary} w-full`} pendingText="処理中…">
        {mode === "login" ? "ログイン" : "登録してはじめる"}
      </SubmitButton>
    </form>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-lg shadow-blue-300/30 ring-1 ring-slate-200">
        <div className="text-3xl" aria-hidden>🌸</div>
        <h1 className="mt-1 text-xl font-bold text-blue-900">就活管理</h1>
        <p className="mt-1 text-sm text-slate-500">{mode === "login" ? "ログイン" : "新規アカウント登録"}</p>
        <AuthForm key={mode} mode={mode} />
        <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-blue-800 hover:underline">
          {mode === "login" ? "アカウントを作成する" : "ログインに戻る"}
        </button>
      </div>
    </main>
  );
}
