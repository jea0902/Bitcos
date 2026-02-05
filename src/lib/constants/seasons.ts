/**
 * 보팅맨 시즌 정의 (연 3등분, LoL 스타일)
 * 명세: docs/votingman-implementation-phases.md 6단계
 *
 * - 시즌 1: 1월 1일 ~ 4월 30일
 * - 시즌 2: 5월 1일 ~ 8월 31일
 * - 시즌 3: 9월 1일 ~ 12월 31일
 */

export const SEASON_MONTHS: [number, number][] = [
  [1, 4],   // 시즌 1: 1~4월
  [5, 8],   // 시즌 2: 5~8월
  [9, 12],  // 시즌 3: 9~12월
];

export type SeasonId = string; // '2025-1', '2025-2', '2025-3'

/** season_id 파싱: '2025-1' → { year: 2025, quarter: 1 } */
export function parseSeasonId(seasonId: SeasonId): { year: number; quarter: number } {
  const [y, q] = seasonId.split("-").map(Number);
  if (!y || !q || q < 1 || q > 3) throw new Error(`Invalid season_id: ${seasonId}`);
  return { year: y, quarter: q };
}

/** 해당 시즌의 시작일·종료일 (YYYY-MM-DD, KST 기준 날짜) */
export function getSeasonDateRange(seasonId: SeasonId): { start: string; end: string } {
  const { year, quarter } = parseSeasonId(seasonId);
  const [startMonth, endMonth] = SEASON_MONTHS[quarter - 1];
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const endDay = new Date(year, endMonth, 0).getDate();
  const end = `${year}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { start, end };
}

/** 날짜 문자열(YYYY-MM-DD)이 시즌 구간 안에 있는지 */
export function isDateInSeason(pollDate: string, seasonId: SeasonId): boolean {
  const { start, end } = getSeasonDateRange(seasonId);
  return pollDate >= start && pollDate <= end;
}

/** 오늘(KST) 기준 현재 시즌 ID */
export function getCurrentSeasonId(now?: Date): SeasonId {
  const d = now ?? new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1–12
  let quarter: number;
  if (month <= 4) quarter = 1;
  else if (month <= 8) quarter = 2;
  else quarter = 3;
  return `${year}-${quarter}`;
}
