# tripwon · 여행 경비

여행에서 쓴 돈을 **원화로 한눈에** 보는 가계부 웹앱이에요.
하나머니·트래블월렛 같은 충전식 카드, 현금, 신용카드를 섞어 써도 실제로 나간 원화에 가깝게 계산해요.

배포: https://tripwon.vercel.app

## 주요 기능

- **여행별 기록**: 여행마다 현지 통화(JPY, USD, EUR 등 12종)와 기본 환율을 정해요. 기본 환율은 무료 환율 API에서 자동으로 채워지고, 직접 고칠 수도 있어요.
- **지출 입력**: 금액, 내용, 카테고리, 결제 수단, 날짜를 적어요. 항공권처럼 "한국에서 미리" 낸 돈도 따로 표시할 수 있어요.
- **충전/환전 기록 + 잔액**: 충전·환전 내역을 적으면 평균 환율로 계산하고, 남은 현지 돈을 보여줘요.
- **신용카드 명세서 금액**: 처음엔 예상 금액으로 보이고, 명세서가 나오면 실제 원화로 고칠 수 있어요.
- **요약**: 총액, 현지/선결제 비율, 하루 평균, 카테고리별·결제 수단별 합계를 보여줘요.
- **CSV 내보내기**: 엑셀에서 열어도 한글이 깨지지 않아요.
- **홈 화면에 추가 (PWA)**: 폰에서 앱처럼 전체 화면으로 열려요.
- **로그인**: 구글 또는 이메일 링크로 해요. 각자 자기 데이터만 볼 수 있어요(Supabase RLS).

## 환율 계산 방식

이 앱에서 가장 신경 쓴 부분이에요. 결제 수단마다 원화가 실제로 나가는 시점이 달라서, 계산 방식도 다르게 했어요.

| 결제 수단 | 원화가 나가는 시점 | 이 앱의 계산 |
|---|---|---|
| 충전카드 (하나머니 등) | 충전할 때 | 충전·환전 기록의 **평균 환율** |
| 현금 | 환전할 때 | 충전카드와 같은 주머니로 보고 **평균 환율** |
| 신용카드 | 카드사 정산 때 (1~2일 뒤) | 여행 기본 환율로 **예상** → 명세서 금액을 넣으면 그 금액 |

- 원화(KRW)로 적은 지출은 그대로 계산해요. 충전·환전 기록이 없으면 여행 기본 환율을 써요.
- **평균 환율인 이유**: 충전식 카드는 여러 번 충전한 돈이 한 지갑에 섞여요. 그래서 결제 시점의 시세보다 평균 단가가 실제 비용에 가까워요. 충전한 돈을 다 쓰면 원화 합계가 실제로 낸 돈과 정확히 일치해요.
- **트레이드오프**: 새로 충전하면 평균이 바뀌어서, 이전 지출의 원화 금액도 조금씩 바뀌어요.
- **잔액** = 충전·환전한 현지 돈 − 충전카드·현금으로 쓴 현지 돈
- 여행 통화는 만든 뒤에 바꿀 수 없어요. 이미 적은 금액이 엉뚱한 숫자가 되기 때문이에요.

계산은 DB 뷰(`trip_wallet`, `expense_krw`)에서 해요. 앱은 계산 결과만 읽어와요.

## 기술 스택

- **Next.js 16** (App Router, TypeScript, Cache Components, `proxy.ts`)
- **Tailwind CSS v4**, Pretendard
- **Supabase**: Postgres + Auth(구글 OAuth, 이메일 매직링크) + RLS, `@supabase/ssr`
- **Vercel**: 호스팅 + Cron
- 환율: [ExchangeRate-API](https://www.exchangerate-api.com) 무료 엔드포인트 (출처 표기 필수, 새 여행 폼에 표시)

## 로컬에서 실행하기

### 1. 설치
```bash
npm install
cp .env.local.example .env.local
```

### 2. 환경 변수 (`.env.local`)
| 이름 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 위와 같은 곳의 publishable key |
| `CRON_SECRET` | (배포용) keepalive cron 인증. 로컬에서는 없어도 돼요 |

### 3. DB 만들기
Supabase **SQL Editor**에서 아래 파일을 **순서대로 한 번씩** 실행해요.
1. `supabase-01_schema.sql`: 여행·지출 테이블, RLS, 원화 환산 뷰
2. `supabase-02_wallet.sql`: 환전 기록 테이블, 결제 수단 3종, 평균 환율·잔액 뷰
3. `supabase-03_memo.sql`: 지출 메모 칸
4. `supabase-04_sharing.sql`: 동행자 공유 (멤버·초대 코드·권한), 사람별 지갑, 지출의 낸 사람
5. `supabase-05_edit_trail.sql`: 지출을 마지막으로 고친 사람·시각 기록
6. `supabase-06_soft_delete.sql`: 지출 논리삭제(되살리기), 충전 기록은 본인만 삭제

### 4. 로그인 설정 (Supabase 대시보드)
- **Authentication → URL Configuration**
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/**`
- **Authentication → Sign In / Providers → Google**: Google Cloud에서 만든 OAuth 클라이언트 ID와 Secret을 넣어요.
  - Google 클라이언트의 승인된 JavaScript 원본: `http://localhost:3000`
  - 승인된 리디렉션 URI: Supabase 화면에 나오는 `https://<프로젝트>.supabase.co/auth/v1/callback`

### 5. 실행
```bash
npm run dev
```
> 서버 액션을 새로 추가한 뒤 `... is undefined` 같은 에러가 나면, 개발 서버를 끄고 `.next` 폴더를 지운 다음 다시 켜요.

## 배포 (Vercel)

1. Vercel에서 GitHub 레포를 Import해요.
2. 환경 변수 3개를 넣어요: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `CRON_SECRET` (아무 긴 랜덤 문자열)
3. Supabase URL Configuration에 배포 주소를 추가해요.
   - Site URL: `https://<배포주소>`
   - Redirect URLs: `https://<배포주소>/**` (localhost 항목은 그대로 둬요)
4. Google 클라이언트의 승인된 JavaScript 원본에 `https://<배포주소>`를 추가해요.

이후에는 `main`에 push할 때마다 자동으로 배포돼요.

### Supabase 일시정지 방지
Supabase 무료 플랜은 7일 동안 활동이 없으면 프로젝트를 일시정지해요. 그래서 `vercel.json`의 cron이 **매일 1회** `/api/keepalive`를 불러 DB에 가벼운 조회를 보내요.
- `CRON_SECRET`이 맞는 호출만 받아요.
- 확인: Vercel → Settings → Cron Jobs → Run, 또는 Supabase Logs에서 `GET /rest/v1/trips?select=id&limit=1`
- 무료 플랜은 자동 백업이 없어요. 여행이 끝나면 CSV로 받아두는 걸 추천해요.

## 폴더 구조

```
src/
├─ app/
│  ├─ page.tsx                     # 내 여행 목록
│  ├─ login/, auth/                # 로그인, OAuth·매직링크 콜백, 로그아웃
│  ├─ trips/
│  │  ├─ actions.ts                # 여행 생성·수정·삭제 (Server Actions)
│  │  ├─ expense-actions.ts        # 지출 생성·수정·삭제
│  │  ├─ exchange-actions.ts       # 충전·환전 생성·수정·삭제
│  │  ├─ new/                      # 새 여행 (여행 폼은 수정 화면과 공용)
│  │  └─ [id]/
│  │     ├─ page.tsx               # 여행 상세: 총액, 잔액, 날짜별 지출
│  │     ├─ edit/                  # 여행 수정·삭제
│  │     ├─ expenses/              # 지출 추가·수정
│  │     ├─ exchanges/             # 충전·환전 추가·수정
│  │     ├─ summary/               # 요약
│  │     └─ export/route.ts        # CSV 내보내기
│  ├─ api/keepalive/route.ts       # Supabase 일시정지 방지 cron
│  └─ manifest.ts                  # PWA
├─ components/                     # 금액 입력, 삭제 확인, 화면 떠날 때 폼 초기화
├─ lib/                            # Supabase 클라이언트, 조회 함수, 통화·카테고리·포맷
└─ proxy.ts                        # 로그인 안 했으면 /login 으로
```

## 라이선스

[MIT](./LICENSE)
