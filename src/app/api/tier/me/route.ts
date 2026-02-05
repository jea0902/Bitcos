/**
 * GET /api/tier/me
 * 현재 로그인 사용자의 시장별 시즌 통계(배치 진행, 승률, MMR, 티어)
 * 7단계: 티어·MMR
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyTierStats } from "@/lib/tier/tier-service";

export async function GET() {
  try {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "로그인이 필요합니다.",
          },
        },
        { status: 401 }
      );
    }

    const { season_id, markets } = await getMyTierStats(user.id);

    return NextResponse.json({
      success: true,
      data: {
        season_id,
        markets: markets.map((m) => ({
          market: m.market,
          placement_matches_played: m.placement_matches_played,
          placement_done: m.placement_done,
          season_win_count: m.season_win_count,
          season_total_count: m.season_total_count,
          win_rate: Math.round(m.win_rate * 10000) / 100,
          mmr: Math.round(m.mmr * 100) / 100,
          tier: m.tier,
          percentile_pct: m.percentile_pct,
        })),
      },
    });
  } catch (error) {
    console.error("Tier me error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "티어 정보를 불러오는데 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
