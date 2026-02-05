/**
 * 인간 지표(데일리 투표) 시장 구분 및 시장별 마감 시간
 * 명세: docs/votingman-implementation-phases.md 시장별 투표 마감 시간
 */

export const SENTIMENT_MARKETS = ["btc", "ndq", "sp500", "kospi", "kosdaq"] as const;
export type SentimentMarket = (typeof SENTIMENT_MARKETS)[number];

/** 시장별 마감 시각 (KST) — 시(0–23), 분(0–59) */
export const MARKET_CLOSE_KST: Record<SentimentMarket, { hour: number; minute: number }> = {
  btc: { hour: 20, minute: 30 },
  ndq: { hour: 3, minute: 30 },
  sp500: { hour: 3, minute: 30 },
  kospi: { hour: 13, minute: 0 },
  kosdaq: { hour: 13, minute: 0 },
};

/** 시장 표시 라벨 */
export const MARKET_LABEL: Record<SentimentMarket, string> = {
  btc: "비트코인",
  ndq: "나스닥",
  sp500: "S&P 500",
  kospi: "코스피",
  kosdaq: "코스닥",
};

/** 섹션 그룹: 비트코인 | 미국 주식 | 한국 주식 */
export const MARKET_SECTIONS: { sectionLabel: string; markets: SentimentMarket[] }[] = [
  { sectionLabel: "비트코인", markets: ["btc"] },
  { sectionLabel: "미국 주식", markets: ["ndq", "sp500"] },
  { sectionLabel: "한국 주식", markets: ["kospi", "kosdaq"] },
];

export function isSentimentMarket(value: string): value is SentimentMarket {
  return SENTIMENT_MARKETS.includes(value as SentimentMarket);
}
