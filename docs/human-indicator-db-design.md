# 인간 지표(데일리 투표) DB 설계 및 운영 가이드

## 1. 목표 정리

- **기록할 것**: 투표한 사람 수, 각자 롱/숏 선택, 다수결 비율, **투표일 비트코인 일봉 시가·종가**, 가격 변동(시가→종가).
- **나중에 보여줄 것**: 섹션에 **"맞출 확률"** (과거 비율 대비 방향을 맞춘 확률).

---

## 2. 확정 사항

### 2.1 비로그인 허용

- **비로그인 허용**: 허용.
- **다중 투표 방지**: **쿠키 방식** `anonymous_id`로 1인 1투표 제한.

### 2.2 회원가입 유도 문구

- **비로그인**: 투표 전에도 **항시** 표시  
  → *"로그인하고 투표하시면, 투표 기록이 저장되어 내가 맞춘 확률을 볼 수 있어요"* + 로그인 링크.
- **로그인**: 한 줄로  
  → *"닉네임 롱 맞출 확률: xx% 숏 맞출 확률: yy%"*.

### 2.3 투표 허용 시간

- **허용 구간**: **KST 00:00 ~ 22:30** (22:30 마감).
- **UI**: 투표 섹션에 **마감 시각 표기** (예: "마감 22:30 (KST)").
- **마감 후**: 22:30 KST 지나면 투표 불가 (버튼 비활성화 + "오늘 투표 마감" 표기).

### 2.4 비트코인 가격·시가·종가·맞음/틀림 기준

- **통화**: 달러(USD) 기준, **소수점 둘째자리**까지 표기 + **한화(KRW)** 표기.
- **시가**: **한국 시간 00:00 시가** (그날 KST 00:00 시점 가격).
- **종가**: **한국 시간 기준**으로 확정.  
  - **제안 확정**: **다음날 00:00 KST** 시점 가격을 그날 일봉의 **종가**로 둠.  
  - 이유: "오늘 비트코인"을 KST 00:00~24:00 일봉으로 쓰면, 그 봉의 종가는 **다음날 00:00 KST**가 자연스러움.  
  - 예: 2월 3일 봉 → 시가 2월 3일 00:00 KST, 종가 2월 4일 00:00 KST.  
  - 데이터 수집: 해당일 22:30 마감 후, **다음날 00:00 KST(또는 00:01 KST) 이후**에 그날 봉의 `btc_close`를 수집·저장하는 cron/job 사용.
- **유저 맞음/틀림 판정**:  
  - **롱** 선택 → 종가 > 시가 이면 **맞음**, 종가 ≤ 시가 이면 **틀림**.  
  - **숏** 선택 → 종가 < 시가 이면 **맞음**, 종가 ≥ 시가 이면 **틀림**.  
  - 모두 위 **시가(KST 00:00)·종가(다음날 KST 00:00)** 기준.

---

## 3. DB 테이블 설계 (확장 가능)

### 3.1 `sentiment_polls` (일별 투표 마스터, 1일 1행)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid, PK | |
| `poll_date` | date, UNIQUE | 투표 대상일 (KST 기준 해당일) |
| `btc_open` | numeric | 해당일 BTC 일봉 시가 (KST 00:00, USD) |
| `btc_close` | numeric | 해당일 BTC 일봉 종가 (다음날 KST 00:00, USD) |
| `btc_change_pct` | numeric (optional) | (종가-시가)/시가*100 |
| `long_count` | int, default 0 | 롱 투표 수 (집계 캐시) |
| `short_count` | int, default 0 | 숏 투표 수 |
| `created_at`, `updated_at` | timestamptz | |

- 가격은 **USD 소수점 둘째자리** 저장. 한화 표기는 조회 시 환율 적용.

### 3.2 `sentiment_votes` (개별 투표, 1투표 1행)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid, PK | |
| `poll_id` | uuid, FK → sentiment_polls.id | 어느 날 투표인지 |
| `user_id` | uuid, nullable, FK → auth.users | 로그인 유저일 때 |
| `anonymous_id` | text, nullable | 비로그인 시 구분자(쿠키) |
| `choice` | text, CHECK IN ('long','short') | 롱/숏 |
| `created_at` | timestamptz | |

- **1인 1투표**: `(poll_id, user_id)` 또는 `(poll_id, anonymous_id)` 기준 앱/DB 제약.  
- **투표 수정**: 같은 날 다른 선택으로 바꾸면 기존 행 UPDATE(choice 변경) 또는 기존 삭제 후 새 INSERT. 롱→숏 변경 시 `long_count` -1, `short_count` +1 반영.

---

## 4. DB에 저장할 항목 정리 (체크리스트)

### 4.1 `sentiment_polls` — 저장 시점·값

| 저장 시점 | 컬럼 | 저장할 값 | 비고 |
|-----------|------|-----------|------|
| **당일 00:00 KST 이후** (당일 투표 오픈 시) | `poll_date` | 오늘 날짜 (KST 기준, YYYY-MM-DD) | 1일 1행 |
| | `btc_open` | 당일 KST 00:00 시점 BTC 가격 (USD, 소수점 둘째자리) | 외부 API 또는 job |
| | `long_count`, `short_count` | 0 | 초기값 |
| **유저 투표 시** (INSERT/UPDATE vote 시) | `long_count`, `short_count` | 기존 ±1 (롱 투표 시 long_count +1, 숏 투표 시 short_count +1; 수정 시 이전 선택 -1, 새 선택 +1) | 트리거 또는 앱 로직 |
| **다음날 00:00 KST 이후** (당일 봉 종가 확정 후) | `btc_close` | 다음날 KST 00:00 시점 BTC 가격 (USD, 소수점 둘째자리) | cron/job |
| | `btc_change_pct` | (btc_close - btc_open) / btc_open * 100 | 계산 저장 또는 조회 시 계산 |

### 4.2 `sentiment_votes` — 저장 시점·값

| 저장 시점 | 컬럼 | 저장할 값 | 비고 |
|-----------|------|-----------|------|
| **유저가 롱/숏 투표 시** (KST 00:00~22:30 내) | `id` | uuid (새 생성) | PK |
| | `poll_id` | 당일 `sentiment_polls.id` | FK |
| | `user_id` | 로그인 시 `auth.users.id`, 비로그인 시 NULL | |
| | `anonymous_id` | 비로그인 시 쿠키에서 읽은 UUID, 로그인 시 NULL | 1인 1투표용 |
| | `choice` | 'long' 또는 'short' | |
| | `created_at` | 현재 시각 (timestamptz) | |
| **같은 유저가 다른 선택으로 수정 시** | 기존 행 | `choice`만 UPDATE, 또는 기존 DELETE 후 새 INSERT | `long_count`/`short_count` 보정 필요 |

### 4.3 다수결 비율 — 저장 vs 계산 (피드백 반영)

- **존재 의의**: 인간 지표는 "대다수의 방향대로 가격이 흘러갈 것인가?"를 보는 것이므로 **다수결 비율은 반드시 화면에 표시**한다.
- **저장 방식**:  
  - **롱/숏 개수**는 `sentiment_polls.long_count`, `short_count`에 저장한다.  
  - **다수결 비율**(롱 %, 숏 %)은 `long_count / (long_count + short_count) * 100` 등으로 **조회 시 계산**하면 되므로 별도 컬럼 없이도 가능하다.  
  - 원하면 `sentiment_polls`에 `long_pct`, `short_pct`(numeric)를 두고, 투표 집계 시 함께 갱신해 **스냅샷으로 저장**하는 선택도 가능하다.
- **정리**: "저장하지 않는다"가 아니라 **"개수(long_count, short_count)를 저장하고, 비율은 그걸로 계산해서 표시"**하는 구조. 비율 전용 컬럼은 선택 사항.

### 4.4 그밖에 저장하지 않는 것 (UI/계산용)

- **한화 가격**: DB에는 USD만 저장. 한화는 조회 시 환율 API로 계산.
- **맞음/틀림**: `btc_open`, `btc_close`, `choice`로 조회 시 판정 (롱이면 종가>시가 여부, 숏이면 종가<시가 여부).

---

## 5. 비로그인 시 다중 투표 방지

- **쿠키 `anonymous_id`**: 첫 투표(또는 첫 방문) 시 UUID 생성 후 쿠키 저장(예: `bitcos_sentiment_anon_id`, 만료 1년).
- 같은 브라우저 = 같은 `anonymous_id` → DB에서 1일 1투표만 허용.
- (선택) IP 등 보조 제한으로 악용 완화.

---

## 6. 회원가입 유도 + 로그인 유저 맞출 확률

- **비로그인**: 투표 전 **항시** "로그인하고 투표하시면, 투표 기록이 저장되어 내가 맞춘 확률을 볼 수 있어요" + 로그인 링크.
- **로그인**: **"닉네임 롱 맞출 확률: xx% 숏 맞출 확률: yy%"** 한 줄.
- 맞출 확률 계산: `sentiment_votes`(user_id) + `sentiment_polls`(btc_open, btc_close) 조인 후, 롱/숏별로 방향 맞춘 비율.

---

## 7. 기타 고려사항

- **RLS**: `sentiment_votes` INSERT는 누구나(비로그인은 anonymous_id만), SELECT는 본인 행만 또는 집계용만. `sentiment_polls` SELECT는 전체 공개, INSERT/UPDATE는 백엔드만.
- **문구**: 통계적 참고용 + 면책 조항 당연히 노출 (노출 위치는 아래 9절 Q&A 참고).
- **개인정보**: 비로그인은 `anonymous_id`(쿠키)만 저장. 쿠키 사용은 개인정보처리방침에 "참여 구분용"으로 명시.

---

## 8. 요약

- **비로그인**: 허용, 쿠키로 1인 1투표.
- **회원가입 유도**: 투표 전 항시 문구 + 로그인 링크. 로그인 시 "닉네임 롱 맞출 확률 xx% 숏 맞출 확률 yy%" 한 줄.
- **투표 시간**: KST 00:00~22:30, 마감 시각 표기, 마감 후 투표 불가.
- **BTC 가격**: 달러 소수점 둘째자리 + 한화. 시가 = KST 00:00, 종가 = **다음날 KST 00:00**. 맞음/틀림은 위 시가·종가 기준.
- **다수결 비율**: `long_count`, `short_count` 저장 후 조회 시 비율 계산해 표시. (선택) `long_pct`/`short_pct` 컬럼으로 스냅샷 저장 가능.

---

## 9. 질문·답변 (Q&A)

### Q1. 면책 조항(통계적 참고용 등)은 어디서 노출되나?

- **확정**: **A안 — 인간 지표 섹션 하단에 작은 글씨로 한 줄** 노출.  
  - 문구 예: *"통계적 참고용이며, 투자 권유가 아닙니다."*  
  - UI: `HumanIndicatorSection` 하단, `text-[10px]` 등 작은 글씨, 가운데 정렬.

### Q2. 비트코인 시가·종가 데이터는 어디서 가져오나? 추천안은?

- **추천**: **Binance 공개 API**  
  - **이유**: 거래량·유동성 최대, 무료 공개 API, 문서화·커뮤니티 풍부, 1h/1d Kline 지원.  
  - **엔드포인트**: `GET https://api.binance.com/api/v3/klines` (symbol=BTCUSDT, interval=1h 또는 1d).  
- **KST 00:00 시가/종가 맞추는 방법**  
  - Binance **1d** 봉은 **UTC 00:00** 기준이라, 한국 일봉(KST 00:00~다음날 00:00)과 **9시간 어긋남**.  
  - **KST 00:00을 정확히 쓰려면**: **1h** 봉으로 해당 시각의 **open** 가격 사용.  
    - 시가(당일 KST 00:00) = **전일 15:00 UTC**에 시작하는 1h 봉의 **open**.  
    - 종가(다음날 KST 00:00) = **당일 15:00 UTC**에 시작하는 1h 봉의 **open**.  
  - **UTC 00:00 일봉을 쓰는 경우**: 시가/종가가 "KST 09:00 기준"이 됨. 문서에 기준을 명시하면 됨.  
- **대안**: CoinGecko / CryptoCompare — 무료 티어로 일봉·특정 시각 가격 조회 가능. Binance보다 유동성·실거래 기준은 약함.  
- **정리**: **가장 일반적·유용한 추천 = Binance**, KST 00:00 정확히 쓰려면 **1h kline + UTC 15:00** open 사용.

### Q3. 회원 관리(users) 테이블이 아니라 sentiment_votes에 개인별로 저장하는 구조가 맞나?

- **맞음.**  
  - **users(회원 관리)**: 로그인·닉네임·프로필 등 **회원 정보**만 저장.  
  - **sentiment_votes**: **투표 기록**만 저장. 한 유저가 여러 날 투표하면 `sentiment_votes`에 **날짜(poll_id)별로 행이 여러 개** 생김.  
- **정리**: 회원 정보는 users, **투표 이력은 sentiment_votes**에 두는 구조가 맞고, 개인별 맞출 확률은 sentiment_votes + sentiment_polls 조인으로 계산하면 됨.

### Q4. 참여 명수, 롱/숏 비율은 어디 DB에서 가져오나?

- **참여 명수**: `sentiment_polls` 해당 일자의 **`long_count + short_count`** (또는 해당 `poll_id`에 대한 `sentiment_votes` 행 수).  
- **롱/숏 비율**: 같은 행의 **`long_count`, `short_count`**를 읽어서  
  - 롱 % = `long_count / (long_count + short_count) * 100`  
  - 숏 % = `short_count / (long_count + short_count) * 100`  
  로 계산.  
- **정리**: **당일 데이터는 `sentiment_polls` 한 행(poll_date=오늘)**에서 `long_count`, `short_count`를 조회하면 되고, 참여 명수·비율 모두 여기서 도출.
