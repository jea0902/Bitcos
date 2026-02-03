/**
 * GET /api/sentiment/poll
 * 오늘(KST) 인간 지표 투표 정보 조회 (poll_id, 시가/종가, 롱/숏 수)
 * - poll이 없으면 생성 후 반환 (btc_open은 Binance에서 조회)
 */

import { NextResponse } from "next/server";
import { getOrCreateTodayPoll } from "@/lib/sentiment/poll-server";

export async function GET() {
  try {
    const { poll } = await getOrCreateTodayPoll();

    return NextResponse.json({
      success: true,
      data: {
        poll_id: poll.id,
        poll_date: poll.poll_date,
        btc_open: poll.btc_open,
        btc_close: poll.btc_close,
        long_count: poll.long_count,
        short_count: poll.short_count,
        total_count: poll.long_count + poll.short_count,
      },
    });
  } catch (error) {
    console.error("[sentiment/poll] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "투표 정보를 불러오는데 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
