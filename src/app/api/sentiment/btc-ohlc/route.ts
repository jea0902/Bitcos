/**
 * 인간 지표용 BTC 시가·종가 테스트 API (Binance 공개 API)
 *
 * GET /api/sentiment/btc-ohlc?poll_date=YYYY-MM-DD
 * - poll_date 생략 시 오늘(KST) 기준
 * - KST 00:00 시가 = 전일 15:00 UTC 1h 봉 open, 다음날 00:00 KST 종가 = 당일 15:00 UTC 1h 봉 open
 */

import {
  fetchBtcOpenCloseKst,
  getTodayKstDateString,
} from "@/lib/binance/btc-kst";
import { NextResponse } from "next/server";

const POLL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pollDateParam = searchParams.get("poll_date");
    const poll_date =
      pollDateParam && POLL_DATE_REGEX.test(pollDateParam)
        ? pollDateParam
        : getTodayKstDateString();

    const result = await fetchBtcOpenCloseKst(poll_date);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        btc_open_rounded: result.btc_open != null ? Number(result.btc_open.toFixed(2)) : null,
        btc_close_rounded: result.btc_close != null ? Number(result.btc_close.toFixed(2)) : null,
      },
    });
  } catch (error) {
    console.error("[btc-ohlc] Binance fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "비트코인 시가·종가 조회에 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
