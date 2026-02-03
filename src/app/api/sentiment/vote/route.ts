/**
 * POST /api/sentiment/vote
 * 인간 지표 투표 (롱/숏). 마감 22:30 KST 검증, 1인 1투표(수정 가능)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTodayPoll } from "@/lib/sentiment/poll-server";
import { isVotingOpenKST } from "@/lib/utils/sentiment-vote";

export async function POST(request: NextRequest) {
  try {
    if (!isVotingOpenKST()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VOTING_CLOSED",
            message: "오늘 투표 마감 시간(22:30 KST)이 지났습니다.",
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const choice = body?.choice as string | undefined;
    const anonymous_id =
      typeof body?.anonymous_id === "string" ? body.anonymous_id.trim() : null;

    if (choice !== "long" && choice !== "short") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "choice는 'long' 또는 'short'이어야 합니다.",
          },
        },
        { status: 400 }
      );
    }

    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();
    const user_id = user?.id ?? null;

    if (!user_id && !anonymous_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "비로그인 시 anonymous_id가 필요합니다.",
          },
        },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();
    const { poll } = await getOrCreateTodayPoll();

    const voteFilter = user_id
      ? { poll_id: poll.id, user_id }
      : { poll_id: poll.id, anonymous_id };

    const { data: existingVote } = await admin
      .from("sentiment_votes")
      .select("id, choice")
      .match(voteFilter)
      .maybeSingle();

    const prevChoice = existingVote?.choice as "long" | "short" | undefined;

    if (existingVote) {
      if (prevChoice === choice) {
        return NextResponse.json({
          success: true,
          data: {
            choice,
            long_count: poll.long_count,
            short_count: poll.short_count,
            total_count: poll.long_count + poll.short_count,
            updated: false,
          },
        });
      }
      await admin.from("sentiment_votes").update({ choice }).eq("id", existingVote.id);

      const longDelta = choice === "long" ? 1 : -1;
      const shortDelta = choice === "short" ? 1 : -1;
      const { data: updatedPoll } = await admin
        .from("sentiment_polls")
        .update({
          long_count: Math.max(0, poll.long_count + longDelta),
          short_count: Math.max(0, poll.short_count + shortDelta),
        })
        .eq("id", poll.id)
        .select("long_count, short_count")
        .single();

      const l = updatedPoll?.long_count ?? poll.long_count;
      const s = updatedPoll?.short_count ?? poll.short_count;
      return NextResponse.json({
        success: true,
        data: {
          choice,
          long_count: l,
          short_count: s,
          total_count: l + s,
          updated: true,
        },
      });
    }

    const { error: insertError } = await admin.from("sentiment_votes").insert({
      poll_id: poll.id,
      user_id: user_id ?? null,
      anonymous_id: anonymous_id ?? null,
      choice,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ALREADY_VOTED",
              message: "이미 투표하셨습니다.",
            },
          },
          { status: 409 }
        );
      }
      throw insertError;
    }

    const longDelta = choice === "long" ? 1 : 0;
    const shortDelta = choice === "short" ? 1 : 0;
    const { data: updatedPoll } = await admin
      .from("sentiment_polls")
      .update({
        long_count: poll.long_count + longDelta,
        short_count: poll.short_count + shortDelta,
      })
      .eq("id", poll.id)
      .select("long_count, short_count")
      .single();

    const l = updatedPoll?.long_count ?? poll.long_count + longDelta;
    const s = updatedPoll?.short_count ?? poll.short_count + shortDelta;

    return NextResponse.json({
      success: true,
      data: {
        choice,
        long_count: l,
        short_count: s,
        total_count: l + s,
        updated: false,
      },
    });
  } catch (error) {
    console.error("[sentiment/vote] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "투표 처리에 실패했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
