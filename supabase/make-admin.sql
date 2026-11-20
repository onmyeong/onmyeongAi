-- 대표님 계정을 관리자로 지정합니다.
-- 사이트에서 카카오로 로그인한 "바로 다음에" 실행하세요.
-- 가장 최근에 로그인한 계정(= 방금 로그인한 대표님)을 관리자로 만듭니다.
update public.profiles set is_admin = true
where id = (select id from auth.users order by last_sign_in_at desc nulls last limit 1);

-- 확인: 관리자 목록 (여기 대표님 닉네임이 보이면 성공)
select nickname, email, is_admin from public.profiles where is_admin;
