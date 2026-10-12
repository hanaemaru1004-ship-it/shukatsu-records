"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_MAX, usernameToEmail } from "@/lib/auth";

export type AuthState = { error?: string };

function parse(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username) return { error: "ユーザー名を入力してください" } as const;
  if (username.length > USERNAME_MAX) return { error: `ユーザー名は${USERNAME_MAX}文字以内で入力してください` } as const;
  return { username, password } as const;
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(p.username), password: p.password });
  if (error) return { error: "ユーザー名またはパスワードが正しくありません" };
  redirect("/");
}

// 8文字以上、かつ 英大文字・英小文字・数字・記号 のうち2種類以上
function passwordError(pw: string): string | null {
  if (pw.length < 8) return "パスワードは8文字以上で入力してください";
  const kinds = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  if (kinds < 2) return "パスワードは英大文字・英小文字・数字・記号のうち2種類以上を組み合わせてください";
  return null;
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const pwError = passwordError(p.password);
  if (pwError) return { error: pwError };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(p.username),
    password: p.password,
    options: { data: { username: p.username } },
  });
  if (error) {
    if (/already|registered/i.test(error.message)) return { error: "このユーザー名は既に使われています" };
    if (/rate limit/i.test(error.message)) return { error: "短時間に操作が集中しました。しばらくしてからお試しください" };
    return { error: `登録に失敗しました: ${error.message}` };
  }
  if (!data.session) {
    // メール確認が有効なままだとセッションが発行されない
    return { error: "登録しましたがログインできませんでした。Supabase の Authentication 設定で「Confirm email」を無効にしてください" };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
