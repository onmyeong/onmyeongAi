-- ════════════════════════════════════════════════════════════════════
--  온명 회원 기능 — 데이터베이스 설계
--  Supabase 대시보드 → SQL Editor → 새 쿼리에 이 파일 전체를 붙여 넣고 Run.
--  여러 번 실행해도 안전하도록 if not exists / or replace 로 작성했습니다.
-- ════════════════════════════════════════════════════════════════════

-- ───────────── 1. 회원 정보 (profiles) ─────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  email       text,
  birth       jsonb,                 -- { y, m, d, h, mi, g, name }  내 사주
  ilju        text,                  -- 일주 (예: 병인)
  couple_code text unique,           -- 커플 연결용 내 코드
  partner_id  uuid references public.profiles(id) on delete set null,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 6자리 커플 코드 (헷갈리는 글자 0·O·1·I 제외)
create or replace function public.new_couple_code() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where couple_code = code);
  end loop;
  return code;
end $$;

-- 처음 로그인하면 회원 정보 한 줄을 자동으로 만듭니다
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, email, couple_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'preferred_username',
             new.raw_user_meta_data->>'user_name', '온명 손님'),
    new.email,
    public.new_couple_code()
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이 SQL 을 실행하기 전에 이미 로그인했던 회원도 빠짐없이 한 줄씩 만들어 둡니다
insert into public.profiles (id, nickname, email, couple_code)
select u.id,
       coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'nickname', '온명 손님'),
       u.email, public.new_couple_code()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 관리자인지 확인 (정책 안에서 씁니다)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 회원이 자기 정보를 고칠 때 관리자 권한·커플 연결은 직접 못 바꾸게 막습니다
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() 가 비어 있으면 SQL Editor(대표님 직접 실행)라서 막지 않습니다
  -- 커플 연결 함수(link_partner) 안에서 고칠 때도 통과시킵니다
  if auth.uid() is not null and not public.is_admin()
     and coalesce(current_setting('onmyeong.linking', true), '') <> 'on' then
    new.is_admin   := old.is_admin;
    new.partner_id := old.partner_id;
    new.couple_code := old.couple_code;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;

drop policy if exists "profiles: 본인 조회" on public.profiles;
create policy "profiles: 본인 조회" on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: 본인 수정" on public.profiles;
create policy "profiles: 본인 수정" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- 연결된 커플 상대의 이름 · 일주 · 생일만 꺼내 보는 함수
create or replace function public.my_partner()
returns table (id uuid, nickname text, ilju text, birth jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, p.nickname, p.ilju, p.birth
  from public.profiles me join public.profiles p on p.id = me.partner_id
  where me.id = auth.uid() and p.partner_id = me.id;
$$;

-- 상대의 코드를 넣으면 서로 연결합니다
create or replace function public.link_partner(code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  other uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  select id into other from public.profiles where couple_code = upper(trim(code));
  if other is null then raise exception '코드를 다시 확인해 주세요'; end if;
  if other = auth.uid() then raise exception '내 코드는 넣을 수 없어요'; end if;
  perform set_config('onmyeong.linking', 'on', true);
  update public.profiles set partner_id = null where partner_id in (auth.uid(), other);
  update public.profiles set partner_id = other where id = auth.uid();
  update public.profiles set partner_id = auth.uid() where id = other;
  return (select nickname from public.profiles where id = other);
end $$;

create or replace function public.unlink_partner() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('onmyeong.linking', 'on', true);
  update public.profiles set partner_id = null
  where id = auth.uid() or partner_id = auth.uid();
end $$;

-- 회원 탈퇴 — 내 계정과 내가 남긴 정보를 모두 지웁니다
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ───────────── 2. 리뷰 (reviews) ─────────────
create table if not exists public.reviews (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  nickname   text,
  ilju       text,
  kind       text not null default 'fortune' check (kind in ('fortune', 'saju', 'couple')),
  rating     int  not null check (rating between 1 and 5),
  body       text not null check (char_length(body) between 2 and 1000),
  photo_url  text,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;

drop policy if exists "reviews: 공개 조회" on public.reviews;
create policy "reviews: 공개 조회" on public.reviews for select
  using (hidden = false or user_id = auth.uid() or public.is_admin());

drop policy if exists "reviews: 본인 작성" on public.reviews;
create policy "reviews: 본인 작성" on public.reviews for insert
  with check (user_id = auth.uid() and hidden = false);

drop policy if exists "reviews: 본인·관리자 수정" on public.reviews;
create policy "reviews: 본인·관리자 수정" on public.reviews for update
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "reviews: 본인·관리자 삭제" on public.reviews;
create policy "reviews: 본인·관리자 삭제" on public.reviews for delete
  using (user_id = auth.uid() or public.is_admin());

-- 손님은 숨김 여부를 직접 바꿀 수 없습니다
create or replace function public.guard_review_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then new.hidden := old.hidden; end if;
  return new;
end $$;
drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before update on public.reviews
  for each row execute function public.guard_review_update();

-- ───────────── 3. 이벤트 신청 (event_entries) ─────────────
create table if not exists public.event_entries (
  id          bigint generated always as identity primary key,
  code        text unique,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  event       text not null default '2027-couple-ring',
  review_id   bigint references public.reviews(id) on delete set null,
  proof_url   text,           -- 인스타 게시물 링크
  proof_path  text,           -- 스토리 캡처 (비공개 저장소 경로)
  status      text not null default '신청' check (status in ('신청', '확인', '당첨', '미당첨')),
  created_at  timestamptz not null default now(),
  unique (user_id, event)
);

-- 신청 번호: ONM-2027-0001
create or replace function public.set_entry_code() returns trigger
language plpgsql as $$
begin
  new.code := 'ONM-2027-' || lpad(new.id::text, 4, '0');
  return new;
end $$;
drop trigger if exists entries_code on public.event_entries;
create trigger entries_code before insert on public.event_entries
  for each row execute function public.set_entry_code();

alter table public.event_entries enable row level security;
drop policy if exists "entries: 본인·관리자 조회" on public.event_entries;
create policy "entries: 본인·관리자 조회" on public.event_entries for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "entries: 본인 신청" on public.event_entries;
create policy "entries: 본인 신청" on public.event_entries for insert
  with check (user_id = auth.uid() and status = '신청');
drop policy if exists "entries: 관리자 수정" on public.event_entries;
create policy "entries: 관리자 수정" on public.event_entries for update
  using (public.is_admin());

-- ───────────── 4. 주문 · 제작 (orders) — 반지 보관함 ─────────────
create table if not exists public.orders (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.profiles(id) on delete set null,
  customer_name text,
  contact       text,
  title         text not null,             -- 반지 이름 (예: 파랑 커플링)
  kind          text,                      -- 원데이 클래스 / 주문제작 / 은점토 …
  size          text,                      -- 호수
  engraving     text,                      -- 각인 문구
  spec          jsonb,                     -- 스튜디오 사양 (선택)
  photo_url     text,
  status        text not null default '접수'
                check (status in ('접수', '왁스', '주물', '광택', '완성', '수령')),
  visit_date    date,
  memo          text,                      -- 관리자 메모 (손님에게도 보입니다)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "orders: 본인·관리자 조회" on public.orders;
create policy "orders: 본인·관리자 조회" on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders: 관리자 관리" on public.orders;
create policy "orders: 관리자 관리" on public.orders for all
  using (public.is_admin()) with check (public.is_admin());

-- ───────────── 5. A/S 신청 (as_requests) ─────────────
create table if not exists public.as_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  order_id   bigint references public.orders(id) on delete set null,
  kind       text not null check (kind in ('광택', '사이즈 수정', '각인', '기타')),
  body       text,
  status     text not null default '접수' check (status in ('접수', '진행', '완료')),
  created_at timestamptz not null default now()
);
alter table public.as_requests enable row level security;
drop policy if exists "as: 본인·관리자 조회" on public.as_requests;
create policy "as: 본인·관리자 조회" on public.as_requests for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "as: 본인 신청" on public.as_requests;
create policy "as: 본인 신청" on public.as_requests for insert
  with check (user_id = auth.uid() and status = '접수');
drop policy if exists "as: 관리자 수정" on public.as_requests;
create policy "as: 관리자 수정" on public.as_requests for update
  using (public.is_admin());

-- ───────────── 6. 웹에서 쓸 수 있는 권한 ─────────────
grant usage on schema public to anon, authenticated;
grant select on public.reviews to anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update on public.event_entries to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update on public.as_requests to authenticated;
grant execute on function public.my_partner(), public.link_partner(text), public.unlink_partner(), public.is_admin(), public.delete_my_account() to authenticated;

-- ───────────── 7. 사진 저장소 ─────────────
-- review-photos: 리뷰 사진 (누구나 볼 수 있음)
-- event-proofs : 이벤트 인증 캡처 (본인과 관리자만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']),
       ('event-proofs', 'event-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

drop policy if exists "review-photos: 본인 폴더 업로드" on storage.objects;
create policy "review-photos: 본인 폴더 업로드" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "event-proofs: 본인 폴더 업로드" on storage.objects;
create policy "event-proofs: 본인 폴더 업로드" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "event-proofs: 본인·관리자 조회" on storage.objects;
create policy "event-proofs: 본인·관리자 조회" on storage.objects for select to authenticated
  using (bucket_id = 'event-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ════════════════════════════════════════════════════════════════════
--  끝. 대표님 계정을 관리자로 만들려면, 사이트에서 카카오로 한 번 로그인한 뒤
--  supabase/make-admin.sql 을 실행하세요.
-- ════════════════════════════════════════════════════════════════════
