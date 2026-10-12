-- 選考ステータス「エントリー済み」を「プレエントリー済み」に変更
-- Supabase の SQL Editor で実行する。既存データも書き換える。
alter table public.companies drop constraint if exists companies_status_check;
update public.companies set status = 'プレエントリー済み' where status = 'エントリー済み';
alter table public.companies add constraint companies_status_check check (status in (
  '未エントリー','プレエントリー済み','インターンシップES提出','本選考ES提出','インターンシップ選考',
  '一次選考','二次選考','三次選考','最終選考','内定','内定承諾','辞退','不合格','選考終了','その他'));
