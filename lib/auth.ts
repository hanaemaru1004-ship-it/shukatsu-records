import { createHash } from "node:crypto";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Supabase Auth はメールアドレス必須のため、ユーザー名を擬似メールに変換して使う。
// （メール確認は Supabase 側で無効にしておくこと。メールは送信されない）
const EMAIL_DOMAIN = "shukatsu-records.app";
export const USERNAME_MAX = 50;

// 日本語など任意の文字を使えるよう、正規化したユーザー名のSHA-256を擬似メールのローカル部にする。
// 表示用のユーザー名は user_metadata.username に保存する。
export const normalizeUsername = (username: string) => username.trim().normalize("NFKC").toLowerCase();
export const usernameToEmail = (username: string) =>
  `u${createHash("sha256").update(normalizeUsername(username)).digest("hex").slice(0, 60)}@${EMAIL_DOMAIN}`;

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
});

export const usernameOf = (user: { user_metadata?: Record<string, unknown> }) =>
  String(user.user_metadata?.username ?? "");
