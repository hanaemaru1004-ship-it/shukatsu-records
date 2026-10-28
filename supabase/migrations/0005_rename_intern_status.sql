-- 選考ステータス「インターンシップ選考」を「インターン参加済」に変更
-- Supabase の SQL Editor で実行する。既存データも書き換える。
alter table public.companies drop constraint if exists companies_status_check;
update public.companies set status = 'インターン参加済' where status = 'インターンシップ選考';
alter table public.companies add constraint companies_status_check check (status in (
  '未エントリー','プレエントリー済み','インターンシップES提出','本選考ES提出','インターン参加済',
  '一次選考','二次選考','三次選考','最終選考','内定','内定承諾','辞退','不合格','選考終了','その他'));
