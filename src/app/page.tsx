"use client";

/**
 * 보팅맨 홈 메인 (2차 MVP)
 *
 * - 메인 영역: 비전 문구 + 3탭(비트코인 | 미국 주식 | 한국 주식) + 탭별 콘텐츠
 */

import { useState } from "react";
import { HumanIndicatorSection, InfluencerPositions, MarketTabCards, MarketTop5Positions, TopRankersBoard, UserInfoCard } from "@/components/home";
import type { HomeTabKey } from "@/components/home/HumanIndicatorSection";

const SECTION_LABELS = [
  "2. 찐 공포/탐욕 지수",
  "3. 고수/인플루언서 실시간 포지션",
  "4. CVD와 고래 매수/매도 신호",
  "5. 주요 수요/공급망 포지션",
  "6. 매물대 × 청산맵",
] as const;

export default function Home() {
  const [activeTab, setActiveTab] = useState<HomeTabKey>("btc");

  return (
    <div className="relative w-full">
      {/* 배경 레이어 (홈 메인 전용) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.08),transparent)]" />
      </div>

      {/* 홈 비중: 왼쪽 25% | 가운데(메인) 50% | 오른쪽 25% */}
      <div className="flex flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-start lg:px-6">
        {/* 왼쪽 25%: 유저 정보 카드 + 보팅맨 TOP5 실시간 포지션 (오른쪽과 동일하게 25% 전체 사용) */}
        <aside className="min-w-0 w-full shrink-0 lg:block lg:w-[25%] lg:pr-3 lg:sticky lg:top-4">
          <div className="min-w-0 w-full space-y-4">
            <UserInfoCard />
            <MarketTop5Positions activeTab={activeTab} />
          </div>
        </aside>

        {/* 가운데 50%: 메인 콘텐츠 */}
        <main className="min-w-0 flex-1 lg:w-[50%] lg:px-2">
      {/* 비전 문구 (버핏 원픽과 동일: 파란 제목 + 노란 부제) */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-[#3b82f6] sm:text-6xl lg:text-7xl">
          탈중앙화 시장 예측 배팅 플랫폼
        </h1>
        <p className="text-xl font-medium text-[#fbbf24] sm:text-2xl lg:text-3xl">
          투자자들이 코인을 배팅해 투자 심리를 반영한 인간 지표
        </p>
      </div>

      {/* 4.1안: 풀스크린 탭 스위처 (큰 블록 카드) */}
      <div className="mb-8">
        <MarketTabCards activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 탭별 콘텐츠: 선택한 탭의 인간 지표 + 플레이스홀더 */}
      <div className="mx-auto max-w-4xl space-y-6">
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="space-y-6"
        >
          <HumanIndicatorSection activeTab={activeTab} />
          {SECTION_LABELS.map((label) => (
            <section
              key={label}
              className="min-h-[120px] rounded border border-dashed border-gray-500/60 bg-transparent p-4"
              style={{ borderWidth: "1px" }}
            >
              <p className="text-xs font-medium text-gray-400">{label}</p>
              <p className="mt-1 text-[10px] text-gray-600 font-mono">
                L3 섹션 · 추후 콘텐츠
              </p>
            </section>
          ))}
        </div>
      </div>
        </main>

        {/* 오른쪽 25%: 비트멕스 리더보드 TOP5 + 코인 유튜버 실시간 포지션 (더미) */}
        <aside className="hidden shrink-0 lg:block lg:w-[25%] lg:pl-3">
          <div className="space-y-4">
            <TopRankersBoard />
            <InfluencerPositions />
          </div>
        </aside>
      </div>
    </div>
  );
}
