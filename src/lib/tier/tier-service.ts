/**
 * 7단계: 시장별 시즌 통계·MMR·티어 계산
 *
 * - 정산된 폴만 참여/당첨 집계 (무효판 제외)
 * - 시장 그룹: btc | us | kr
 * - MMR = 보유 코인 × 시즌 누적 승률, 배치 보정 70%~130%
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { TierMarket } from "@/lib/supabase/db-types";
import type { TierKey } from "@/lib/supabase/db-types";
import {
  getSeasonDateRange,
  getCurrentSeasonId,
  isDateInSeason,
  type SeasonId,
} from "@/lib/constants/seasons";
import {
  SENTIMENT_TO_TIER_MARKET,
  PLACEMENT_MATCHES_REQUIRED,
  MMR_CLAMP_MIN,
  MMR_CLAMP_MAX,
  TIER_PERCENTILE_CUTOFFS,
} from "./constants";

const TIER_MARKET_FROM_SENTIMENT = SENTIMENT_TO_TIER_MARKET as Record<string, TierMarket>;

export type UserMarketStats = {
  market: TierMarket;
  season_id: SeasonId;
  placement_matches_played: number;
  placement_done: boolean;
  season_win_count: number;
  season_total_count: number;
  win_rate: number;
  mmr: number;
  prev_season_mmr: number | null;
  tier: TierKey | null;
  /** 배치 완료 시 해당 시장 내 상위 몇 % (0~100, 소수 둘째자리) */
  percentile_pct: number | null;
};

/**
 * 시즌·시장 그룹에 해당하는 정산된 폴 ID 목록 조회
 * (payout_history에 1건이라도 있는 폴 = 정산 완료, 무효판 제외됨)
 */
async function getSettledPollIdsInSeason(
  seasonId: SeasonId,
  tierMarket: TierMarket
): Promise<{ poll_id: string; market: string }[]> {
  const admin = createSupabaseAdmin();
  const { start, end } = getSeasonDateRange(seasonId);

  const { data: payouts } = await admin
    .from("payout_history")
    .select("poll_id")
    .not("poll_id", "is", null);

  const distinctPollIds = [...new Set((payouts ?? []).map((p) => p.poll_id))];
  if (distinctPollIds.length === 0) return [];

  const { data: polls } = await admin
    .from("sentiment_polls")
    .select("id, poll_date, market")
    .in("id", distinctPollIds)
    .gte("poll_date", start)
    .lte("poll_date", end)
    .not("market", "is", null);

  const filtered = (polls ?? []).filter((p) => {
    const group = TIER_MARKET_FROM_SENTIMENT[p.market ?? ""];
    return group === tierMarket;
  });

  return filtered.map((p) => ({ poll_id: p.id, market: p.market ?? "" }));
}

/**
 * 한 유저의 시장·시즌별 참여 횟수·당첨 횟수 계산
 */
async function computeUserMarketSeason(
  userId: string,
  tierMarket: TierMarket,
  seasonId: SeasonId
): Promise<{
  placement_matches_played: number;
  season_win_count: number;
  season_total_count: number;
}> {
  const admin = createSupabaseAdmin();
  const settled = await getSettledPollIdsInSeason(seasonId, tierMarket);
  const pollIds = settled.map((s) => s.poll_id);
  if (pollIds.length === 0) {
    return {
      placement_matches_played: 0,
      season_win_count: 0,
      season_total_count: 0,
    };
  }

  const { data: votes } = await admin
    .from("sentiment_votes")
    .select("poll_id")
    .eq("user_id", userId)
    .gt("bet_amount", 0)
    .in("poll_id", pollIds);

  const participatedPollIds = [...new Set((votes ?? []).map((v) => v.poll_id))];
  const placement_matches_played = participatedPollIds.length;

  const { count: winCount } = await admin
    .from("payout_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("poll_id", participatedPollIds);

  return {
    placement_matches_played,
    season_win_count: winCount ?? 0,
    season_total_count: placement_matches_played,
  };
}

/**
 * 이전 시즌 ID (같은 연도 내에서만; 연도 바뀌면 null 반환으로 보정 없음)
 */
function getPrevSeasonId(seasonId: SeasonId): SeasonId | null {
  const [y, q] = seasonId.split("-").map(Number);
  if (q === 1) return null;
  return `${y}-${q - 1}`;
}

/**
 * 시장·시즌 내 배치 완료 유저 중 해당 MMR보다 높은 유저 비율로 "상위 몇 %" 계산 (소수 둘째자리)
 */
async function getMarketPercentile(
  admin: Awaited<ReturnType<typeof createSupabaseAdmin>>,
  market: TierMarket,
  seasonId: SeasonId,
  userMmr: number
): Promise<number | null> {
  const { count: total } = await admin
    .from("user_season_stats")
    .select("id", { count: "exact", head: true })
    .eq("market", market)
    .eq("season_id", seasonId)
    .eq("placement_done", true);
  if (total == null || total === 0) return null;

  const { count: above } = await admin
    .from("user_season_stats")
    .select("id", { count: "exact", head: true })
    .eq("market", market)
    .eq("season_id", seasonId)
    .eq("placement_done", true)
    .gt("mmr", userMmr);
  const rank = above ?? 0;
  const pct = ((total - rank) / total) * 100;
  return Math.round(pct * 100) / 100;
}

async function addPercentilesToMarkets(
  admin: Awaited<ReturnType<typeof createSupabaseAdmin>>,
  seasonId: SeasonId,
  markets: Omit<UserMarketStats, "percentile_pct">[]
): Promise<UserMarketStats[]> {
  return Promise.all(
    markets.map(async (m) => ({
      ...m,
      percentile_pct:
        m.placement_done && typeof m.mmr === "number"
          ? await getMarketPercentile(admin, m.market, seasonId, m.mmr)
          : null,
    }))
  );
}

/**
 * 한 유저의 시장별 현재 시즌 통계 계산 (DB 읽기만, 저장 안 함)
 */
export async function computeUserStatsForSeason(
  userId: string,
  seasonId: SeasonId = getCurrentSeasonId()
): Promise<UserMarketStats[]> {
  const admin = createSupabaseAdmin();

  const { data: userRow } = await admin
    .from("users")
    .select("voting_coin_balance")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  const balance = Number(userRow?.voting_coin_balance ?? 0);

  const prevSeasonId = getPrevSeasonId(seasonId);
  const prevMmrs: Record<TierMarket, number | null> = { btc: null, us: null, kr: null };
  if (prevSeasonId) {
    const { data: prevRows } = await admin
      .from("user_season_stats")
      .select("market, mmr")
      .eq("user_id", userId)
      .eq("season_id", prevSeasonId);
    for (const row of prevRows ?? []) {
      prevMmrs[row.market as TierMarket] = Number(row.mmr);
    }
  }

  const results: UserMarketStats[] = [];
  for (const market of ["btc", "us", "kr"] as TierMarket[]) {
    const { placement_matches_played, season_win_count, season_total_count } =
      await computeUserMarketSeason(userId, market, seasonId);

    const placement_done = placement_matches_played >= PLACEMENT_MATCHES_REQUIRED;
    const win_rate =
      season_total_count > 0 ? season_win_count / season_total_count : 0;
    let mmr = placement_done ? balance * win_rate : 0;

    const prev = prevMmrs[market];
    if (prev != null && prev > 0 && placement_done) {
      mmr = Math.max(prev * MMR_CLAMP_MIN, Math.min(prev * MMR_CLAMP_MAX, mmr));
    }

    results.push({
      market,
      season_id: seasonId,
      placement_matches_played,
      placement_done,
      season_win_count,
      season_total_count,
      win_rate,
      mmr,
      prev_season_mmr: prev,
      tier: null, // 티어는 refreshMarketSeason에서 코호트 기준으로 부여
      percentile_pct: null,
    });
  }
  return results;
}

/**
 * 시장·시즌별 전체 유저 MMR 계산 후 티어 부여하고 user_season_stats upsert
 */
export async function refreshMarketSeason(
  tierMarket: TierMarket,
  seasonId: SeasonId
): Promise<{ updated: number }> {
  const admin = createSupabaseAdmin();
  const { start, end } = getSeasonDateRange(seasonId);

  const settled = await getSettledPollIdsInSeason(seasonId, tierMarket);
  const pollIds = settled.map((s) => s.poll_id);
  if (pollIds.length === 0) {
    return { updated: 0 };
  }

  const { data: votes } = await admin
    .from("sentiment_votes")
    .select("user_id, poll_id")
    .in("poll_id", pollIds)
    .gt("bet_amount", 0);

  const userParticipations = new Map<string, Set<string>>();
  for (const v of votes ?? []) {
    if (!v.user_id) continue;
    let set = userParticipations.get(v.user_id);
    if (!set) {
      set = new Set();
      userParticipations.set(v.user_id, set);
    }
    set.add(v.poll_id);
  }

  const { data: payouts } = await admin
    .from("payout_history")
    .select("user_id, poll_id")
    .in("poll_id", pollIds);

  const userWins = new Map<string, Set<string>>();
  for (const p of payouts ?? []) {
    let set = userWins.get(p.user_id);
    if (!set) {
      set = new Set();
      userWins.set(p.user_id, set);
    }
    set.add(p.poll_id);
  }

  const { data: users } = await admin
    .from("users")
    .select("user_id, voting_coin_balance")
    .in("user_id", [...userParticipations.keys()])
    .is("deleted_at", null);

  const balanceByUser = new Map<string, number>();
  for (const u of users ?? []) {
    balanceByUser.set(u.user_id, Number(u.voting_coin_balance ?? 0));
  }

  const prevSeasonId = getPrevSeasonId(seasonId);
  const prevMmrs = new Map<string, number>();
  if (prevSeasonId) {
    const { data: prevRows } = await admin
      .from("user_season_stats")
      .select("user_id, mmr")
      .eq("market", tierMarket)
      .eq("season_id", prevSeasonId);
    for (const r of prevRows ?? []) {
      prevMmrs.set(r.user_id, Number(r.mmr));
    }
  }

  type Row = {
    user_id: string;
    placement_matches_played: number;
    placement_done: boolean;
    season_win_count: number;
    season_total_count: number;
    mmr: number;
    prev_season_mmr: number | null;
    tier: TierKey | null;
  };

  const rows: Row[] = [];
  for (const [userId, pollIdSet] of userParticipations) {
    const played = pollIdSet.size;
    const wins = (userWins.get(userId) ?? new Set()).size;
    const placement_done = played >= PLACEMENT_MATCHES_REQUIRED;
    const win_rate = played > 0 ? wins / played : 0;
    const balance = balanceByUser.get(userId) ?? 0;
    let mmr = placement_done ? balance * win_rate : 0;
    const prev = prevSeasonId ? prevMmrs.get(userId) ?? null : null;
    if (prev != null && prev > 0 && placement_done) {
      mmr = Math.max(prev * MMR_CLAMP_MIN, Math.min(prev * MMR_CLAMP_MAX, mmr));
    }

    rows.push({
      user_id: userId,
      placement_matches_played: played,
      placement_done,
      season_win_count: wins,
      season_total_count: played,
      mmr,
      prev_season_mmr: prev,
      tier: null,
    });
  }

  const placementDoneRows = rows.filter((r) => r.placement_done).sort((a, b) => b.mmr - a.mmr);
  const n = placementDoneRows.length;
  for (let i = 0; i < placementDoneRows.length; i++) {
    const fromTopPct = ((n - i) / n) * 100;
    let tier: TierKey = "gold";
    for (const { tier: t, fromTopPct: cut } of TIER_PERCENTILE_CUTOFFS) {
      if (fromTopPct <= cut) {
        tier = t;
        break;
      }
    }
    placementDoneRows[i].tier = tier;
  }

  let updated = 0;
  for (const row of rows) {
    const { error } = await admin.from("user_season_stats").upsert(
      {
        user_id: row.user_id,
        market: tierMarket,
        season_id: seasonId,
        placement_matches_played: row.placement_matches_played,
        placement_done: row.placement_done,
        season_win_count: row.season_win_count,
        season_total_count: row.season_total_count,
        mmr: row.mmr,
        prev_season_mmr: row.prev_season_mmr,
        tier: row.tier,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,market,season_id",
        ignoreDuplicates: false,
      }
    );
    if (!error) updated++;
  }
  return { updated };
}

/**
 * 내 티어·MMR 조회: user_season_stats 우선, 없으면 계산 후 upsert.
 * 배치 완료인데 티어가 비어 있는 시장이 있으면 해당 시장만 갱신 후 재조회(유저별 수동 호출 없이 페이지 로드 시 자동 반영).
 */
export async function getMyTierStats(userId: string): Promise<{
  season_id: SeasonId;
  markets: UserMarketStats[];
}> {
  const admin = createSupabaseAdmin();
  const seasonId = getCurrentSeasonId();

  const { data: existing } = await admin
    .from("user_season_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("season_id", seasonId)
    .order("market", { ascending: true });

  const toRefresh = (rows: { market: string; placement_done: boolean; tier: string | null }[]): TierMarket[] =>
    (rows ?? [])
      .filter((r) => r.placement_done && !r.tier)
      .map((r) => r.market as TierMarket);

  if (existing && existing.length === 3) {
    const needRefresh = toRefresh(existing);
    if (needRefresh.length > 0) {
      for (const market of needRefresh) {
        await refreshMarketSeason(market, seasonId);
      }
      const { data: after } = await admin
        .from("user_season_stats")
        .select("*")
        .eq("user_id", userId)
        .eq("season_id", seasonId)
        .order("market", { ascending: true });
      const rows = (after && after.length === 3) ? after : existing;
      const raw: Omit<UserMarketStats, "percentile_pct">[] = rows.map((r) => ({
        market: r.market as TierMarket,
        season_id: r.season_id as SeasonId,
        placement_matches_played: r.placement_matches_played,
        placement_done: r.placement_done,
        season_win_count: r.season_win_count,
        season_total_count: r.season_total_count,
        win_rate: r.season_total_count > 0 ? r.season_win_count / r.season_total_count : 0,
        mmr: Number(r.mmr),
        prev_season_mmr: r.prev_season_mmr != null ? Number(r.prev_season_mmr) : null,
        tier: r.tier as TierKey | null,
      }));
      const markets = await addPercentilesToMarkets(admin, seasonId, raw);
      return { season_id: seasonId, markets };
    }
    const raw: Omit<UserMarketStats, "percentile_pct">[] = existing.map((r) => ({
      market: r.market as TierMarket,
      season_id: r.season_id as SeasonId,
      placement_matches_played: r.placement_matches_played,
      placement_done: r.placement_done,
      season_win_count: r.season_win_count,
      season_total_count: r.season_total_count,
      win_rate: r.season_total_count > 0 ? r.season_win_count / r.season_total_count : 0,
      mmr: Number(r.mmr),
      prev_season_mmr: r.prev_season_mmr != null ? Number(r.prev_season_mmr) : null,
      tier: r.tier as TierKey | null,
    }));
    const markets = await addPercentilesToMarkets(admin, seasonId, raw);
    return { season_id: seasonId, markets };
  }

  const computed = await computeUserStatsForSeason(userId, seasonId);

  const { data: existingForMerge } = await admin
    .from("user_season_stats")
    .select("market, tier")
    .eq("user_id", userId)
    .eq("season_id", seasonId);

  const tierByMarket = new Map<string, TierKey | null>();
  for (const r of existingForMerge ?? []) {
    if (r.tier) tierByMarket.set(r.market, r.tier as TierKey);
  }

  for (const m of computed) {
    const preserveTier = tierByMarket.get(m.market) ?? m.tier;
    await admin.from("user_season_stats").upsert(
      {
        user_id: userId,
        market: m.market,
        season_id: m.season_id,
        placement_matches_played: m.placement_matches_played,
        placement_done: m.placement_done,
        season_win_count: m.season_win_count,
        season_total_count: m.season_total_count,
        mmr: m.mmr,
        prev_season_mmr: m.prev_season_mmr,
        tier: preserveTier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,market,season_id", ignoreDuplicates: false }
    );
  }

  const needRefresh = computed.filter((m) => m.placement_done && !tierByMarket.get(m.market)).map((m) => m.market);
  if (needRefresh.length > 0) {
    for (const market of needRefresh) {
      await refreshMarketSeason(market, seasonId);
    }
    const { data: after } = await admin
      .from("user_season_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("season_id", seasonId)
      .order("market", { ascending: true });
    if (after && after.length === 3) {
      const raw: Omit<UserMarketStats, "percentile_pct">[] = after.map((r) => ({
        market: r.market as TierMarket,
        season_id: r.season_id as SeasonId,
        placement_matches_played: r.placement_matches_played,
        placement_done: r.placement_done,
        season_win_count: r.season_win_count,
        season_total_count: r.season_total_count,
        win_rate: r.season_total_count > 0 ? r.season_win_count / r.season_total_count : 0,
        mmr: Number(r.mmr),
        prev_season_mmr: r.prev_season_mmr != null ? Number(r.prev_season_mmr) : null,
        tier: r.tier as TierKey | null,
      }));
      const markets = await addPercentilesToMarkets(admin, seasonId, raw);
      return { season_id: seasonId, markets };
    }
  }

  const raw: Omit<UserMarketStats, "percentile_pct">[] = computed.map((m) => ({
    ...m,
    tier: tierByMarket.get(m.market) ?? m.tier,
  }));
  const markets = await addPercentilesToMarkets(admin, seasonId, raw);
  return { season_id: seasonId, markets };
}
