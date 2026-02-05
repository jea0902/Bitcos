/**
 * POST /api/tier/refresh
 * 현재 시즌·전 시장에 대해 MMR·티어 재계산 후 user_season_stats upsert.
 * cron 또는 관리자용. 쿼리 ?market=btc|us|kr 미지정 시 3개 시장 모두 갱신.
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshMarketSeason } from "@/lib/tier/tier-service";
import { getCurrentSeasonId } from "@/lib/constants/seasons";
import type { TierMarket } from "@/lib/supabase/db-types";

const TIER_MARKETS: TierMarket[] = ["btc", "us", "kr"];

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketParam = searchParams.get("market");
    const seasonId = getCurrentSeasonId();

    const markets: TierMarket[] =
      marketParam && TIER_MARKETS.includes(marketParam as TierMarket)
        ? [marketParam as TierMarket]
        : TIER_MARKETS;

    let totalUpdated = 0;
    for (const market of markets) {
      const { updated } = await refreshMarketSeason(market, seasonId);
      totalUpdated += updated;
    }

    return NextResponse.json({
      success: true,
      data: { season_id: seasonId, markets_updated: markets.length, rows_updated: totalUpdated },
    });
  } catch (error) {
    console.error("Tier refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "티어 갱신에 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
