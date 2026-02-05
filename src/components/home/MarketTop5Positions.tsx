"use client";

/**
 * 보팅맨 가입 유저 TOP5 실시간 포지션(투표)
 * - 홈 탭(비트코인 | 미국 주식 | 한국 주식)에 따라 해당 시장 투표 기준 TOP5 표시
 * - 8단계 리더보드 연동 전까지 더미 데이터
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HomeTabKey } from "./HumanIndicatorSection";

type PositionRow = {
  rank: number;
  nickname: string;
  choice: "long" | "short";
  betAmount: number;
};

/** 비트코인 단일 시장 TOP5 더미 */
const BTC_TOP5: PositionRow[] = [
  { rank: 1, nickname: "비트헌터", choice: "long", betAmount: 5000 },
  { rank: 2, nickname: "롱러버", choice: "long", betAmount: 3200 },
  { rank: 3, nickname: "숏폼", choice: "short", betAmount: 2800 },
  { rank: 4, nickname: "달빛매매", choice: "long", betAmount: 2100 },
  { rank: 5, nickname: "코인마스터", choice: "short", betAmount: 1800 },
];

/** 미국 주식: 나스닥 / S&P500 지수별 TOP5 더미 */
const US_TOP5_BY_INDEX: Record<"nasdaq" | "sp500", PositionRow[]> = {
  nasdaq: [
    { rank: 1, nickname: "나스닥킹", choice: "long", betAmount: 4500 },
    { rank: 2, nickname: "나스닥헌터", choice: "short", betAmount: 3300 },
    { rank: 3, nickname: "QQQ매니아", choice: "long", betAmount: 2700 },
    { rank: 4, nickname: "성장주러버", choice: "long", betAmount: 2200 },
    { rank: 5, nickname: "테크고수", choice: "short", betAmount: 1900 },
  ],
  sp500: [
    { rank: 1, nickname: "SP500러버", choice: "short", betAmount: 3100 },
    { rank: 2, nickname: "인덱스헌터", choice: "long", betAmount: 2800 },
    { rank: 3, nickname: "미국주식왕", choice: "long", betAmount: 2600 },
    { rank: 4, nickname: "가치투자자", choice: "long", betAmount: 2300 },
    { rank: 5, nickname: "월가꾼", choice: "short", betAmount: 1900 },
  ],
};

/** 한국 주식: 코스피 / 코스닥 지수별 TOP5 더미 */
const KR_TOP5_BY_INDEX: Record<"kospi" | "kosdaq", PositionRow[]> = {
  kospi: [
    { rank: 1, nickname: "코스피마스터", choice: "long", betAmount: 4000 },
    { rank: 2, nickname: "시총상위러버", choice: "short", betAmount: 3100 },
    { rank: 3, nickname: "배당헌터", choice: "long", betAmount: 2600 },
    { rank: 4, nickname: "지수추종러", choice: "long", betAmount: 2200 },
    { rank: 5, nickname: "국장고수", choice: "short", betAmount: 1800 },
  ],
  kosdaq: [
    { rank: 1, nickname: "코스닥러버", choice: "short", betAmount: 2900 },
    { rank: 2, nickname: "K스탁", choice: "long", betAmount: 2500 },
    { rank: 3, nickname: "성장주스나이퍼", choice: "long", betAmount: 2300 },
    { rank: 4, nickname: "테마헌터", choice: "long", betAmount: 2000 },
    { rank: 5, nickname: "증권맨", choice: "short", betAmount: 1700 },
  ],
};

/** 공통: 섹션 헤더 + 컬럼 헤더 + TOP5 행 렌더링 */
function PositionsSection({
  title,
  rows,
}: {
  title: string;
  rows: PositionRow[];
}) {
  return (
    <section className="space-y-2">
      <p className="px-3 text-xs font-medium text-muted-foreground">{title}</p>
      {/* 컬럼명: 순위 | 닉네임 | 포지션 | 배팅한 코인 수 (데이터 행과 동일 그리드로 일직선 정렬) */}
      <div className="grid grid-cols-[auto_1fr_4rem_5.5rem] gap-2 px-3 pb-1.5 text-xs font-medium text-muted-foreground">
        <span className="text-right">순위</span>
        <span className="min-w-0 overflow-hidden text-ellipsis">닉네임</span>
        <span className="text-center">포지션</span>
        <span className="text-right">배팅한 코인 수</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={`${title}-${row.rank}`}
            className="grid min-w-0 grid-cols-[auto_1fr_4rem_5.5rem] items-center gap-2 overflow-hidden rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
          >
            <span className="shrink-0 text-right font-medium text-muted-foreground tabular-nums">
              {row.rank}위
            </span>
            <span
              className="min-w-0 overflow-hidden text-ellipsis font-medium text-foreground"
              title={row.nickname}
            >
              {row.nickname.length > 5 ? `${row.nickname.slice(0, 5)}…` : row.nickname}
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold",
                row.choice === "long"
                  ? "bg-emerald-500/20 text-emerald-500"
                  : "bg-rose-500/20 text-rose-500"
              )}
            >
              {row.choice === "long" ? "롱" : "숏"}
            </span>
            <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {row.betAmount.toLocaleString()}코인
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MarketTop5Positions({
  activeTab,
  className,
}: {
  activeTab: HomeTabKey;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border bg-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="truncate text-base">
          보팅맨 TOP5 랭커 실시간 포지션
        </CardTitle>
        <p className="truncate text-xs text-muted-foreground">시장별 투표 기준 TOP5 (더미)</p>
      </CardHeader>
      <CardContent className="overflow-hidden space-y-4">
        {activeTab === "btc" && (
          <PositionsSection title="비트코인 시장 투표 기준 (더미)" rows={BTC_TOP5} />
        )}

        {activeTab === "us" && (
          <>
            <PositionsSection title="나스닥 지수 시장 투표 기준 (더미)" rows={US_TOP5_BY_INDEX.nasdaq} />
            <div className="h-px bg-border/60" />
            <PositionsSection title="S&P500 지수 시장 투표 기준 (더미)" rows={US_TOP5_BY_INDEX.sp500} />
          </>
        )}

        {activeTab === "kr" && (
          <>
            <PositionsSection title="코스피 지수 시장 투표 기준 (더미)" rows={KR_TOP5_BY_INDEX.kospi} />
            <div className="h-px bg-border/60" />
            <PositionsSection title="코스닥 지수 시장 투표 기준 (더미)" rows={KR_TOP5_BY_INDEX.kosdaq} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
