-- インターンシップ / 本選考 の区別を追加
-- 既存データは「本選考」扱いに移行する（必要なら画面から変更）。
-- Supabase の SQL Editor で実行する。

-- 1) 選考ステータス: エントリーシート提出 → インターンシップES提出 / 本選考ES提出
alter table public.companies drop constraint if exists companies_status_check;
update public.companies set status = '本選考ES提出' where status = 'エントリーシート提出';
alter table public.companies add constraint companies_status_check check (status in (
  '未エントリー','エントリー済み','インターンシップES提出','本選考ES提出','インターンシップ選考',
  '一次選考','二次選考','三次選考','最終選考','内定','内定承諾','辞退','不合格','選考終了','その他'));

-- 2) 記録の種類: ES / 面接 を分割
alter table public.records drop constraint if exists records_record_type_check;
update public.records set record_type = '本選考ES' where record_type = 'ES';
update public.records set record_type = '本選考面接' where record_type = '面接';
alter table public.records add constraint records_record_type_check check (record_type in (
  'インターンシップES','本選考ES','WEBテスト','インターンシップ面接','本選考面接',
  'インターンシップ','グループディスカッション','説明会','その他'));

-- 3) 予定の種類: ES締切 / 面接 を分割
alter table public.events drop constraint if exists events_event_type_check;
update public.events set event_type = '本選考ES締切' where event_type = 'エントリーシート締切';
update public.events set event_type = '本選考一次面接' where event_type = '一次面接';
update public.events set event_type = '本選考二次面接' where event_type = '二次面接';
update public.events set event_type = '本選考最終面接' where event_type = '最終面接';
alter table public.events add constraint events_event_type_check check (event_type in (
  '説明会','インターンシップES締切','本選考ES締切','WEBテスト締切','インターンシップ面接',
  '本選考一次面接','本選考二次面接','本選考最終面接','インターンシップ','仕事体験',
  'グループディスカッション','内定承諾期限','その他'));
