"use client";

/**
 * HumanIndicatorSection – 인간 지표 (3개 섹션: 비트코인 | 미국 주식 | 한국 주식)
 *
 * - GET /api/sentiment/polls 로 5개 시장 폴 일괄 조회
 * - 각 시장별 마감 시간 적용, 로그인 시 보팅코인 배팅·취소
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MARKET_SECTIONS } from "@/lib/constants/sentiment-markets";
import { MarketVoteCard } from "./MarketVoteCard";
import type { SentimentMarket } from "@/lib/constants/sentiment-markets";
import type { PollData } from "./MarketVoteCard";

export type PollsData = Record<string, PollData>;

/** 홈 탭과 매칭: 비트코인 | 미국 주식 | 한국 주식 */
export type HomeTabKey = "btc" | "us" | "kr";

const TAB_TO_SECTION_INDEX: Record<HomeTabKey, number> = {
  btc: 0,
  us: 1,
  kr: 2,
};

type Props = {
  /** 지정 시 해당 탭의 시장만 렌더 (홈 3탭용). 미지정 시 전체 노출 */
  activeTab?: HomeTabKey;
};

export function HumanIndicatorSection({ activeTab }: Props = {}) {
  const [polls, setPolls] = useState<PollsData | null>(null);
  const [user, setUser] = useState<{ nickname: string; voting_coin_balance?: number } | null>(null);

  const refetchUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from("users")
      .select("nickname, voting_coin_balance")
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) {
      setUser({
        nickname: data.nickname,
        voting_coin_balance: data.voting_coin_balance != null ? Number(data.voting_coin_balance) : undefined,
      });
    }
  }, []);

  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch("/api/sentiment/polls");
      const json = await res.json();
      if (json?.success && json?.data) {
        setPolls(json.data as PollsData);
      }
    } catch {
      setPolls(null);
    }
  }, []);

  /** 투표/취소 후 폴·유저 갱신. new_balance 전달 시 즉시 반영 후 refetch */
  const refetch = useCallback(
    async (opts?: { new_balance?: number }) => {
      if (opts?.new_balance != null && typeof opts.new_balance === "number") {
        setUser((prev) =>
          prev ? { ...prev, voting_coin_balance: opts.new_balance } : null
        );
      }
      await fetchPolls();
      await refetchUser();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-balance-updated"));
      }
    },
    [fetchPolls, refetchUser]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      fetchPolls();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchPolls]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("users")
        .select("nickname, voting_coin_balance")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (data) {
        setUser({
          nickname: data.nickname,
          voting_coin_balance: data.voting_coin_balance != null ? Number(data.voting_coin_balance) : undefined,
        });
      }
    });
  }, []);

  return (
    <div className="space-y-8" aria-labelledby="human-indicator-heading">
      <h2
        id="human-indicator-heading"
        className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        인간 지표
      </h2>

      {(activeTab != null
        ? [MARKET_SECTIONS[TAB_TO_SECTION_INDEX[activeTab]]]
        : MARKET_SECTIONS
      ).map(({ sectionLabel, markets }) => (
        <div key={sectionLabel}>
          {activeTab == null && (
            <h3 className="mb-3 text-base font-semibold text-foreground">
              {sectionLabel}
            </h3>
          )}
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {markets.map((market) => (
              <MarketVoteCard
                key={market}
                market={market as SentimentMarket}
                poll={polls?.[market] ?? null}
                user={user}
                onUpdate={refetch}
              />
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-[10px] text-muted-foreground">
        통계적 참고용이며, 투자 권유가 아닙니다.
      </p>
    </div>
  );
}
