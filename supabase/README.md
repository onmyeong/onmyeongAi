# 온명 회원 기능 — Supabase 설정

1. Supabase 대시보드 → **SQL Editor** → **New query**
2. `schema.sql` 전체를 붙여 넣고 **Run** — 여러 번 실행해도 안전합니다.
3. 사이트에서 카카오로 로그인한 직후 `make-admin.sql` 을 같은 방법으로 실행하면 그 계정이 관리자가 됩니다.

| 테이블 | 내용 |
| --- | --- |
| profiles | 회원 · 내 사주 · 커플 연결 · 관리자 여부 |
| reviews | 사주/신년운세 리뷰 (로그인한 누구나, 관리자가 숨김 가능) |
| event_entries | 이벤트 신청 (신청 번호 ONM-2027-0001) |
| orders | 주문 · 제작 진행 (관리자가 등록, 손님은 본인 것만 조회) |
| as_requests | A/S 신청 |

저장소: `review-photos` (공개), `event-proofs` (본인과 관리자만).
