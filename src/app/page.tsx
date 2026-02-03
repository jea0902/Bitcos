"use client";

/**
 * Bitcos 홈 메인 (2차 MVP)
 *
 * - 3단 레이아웃(광고|메인|광고)은 루트 레이아웃(AdRailLayout)에서 적용됨
 * - 이 페이지는 메인 영역만 담당: 비전 문구 + 인간 지표 등 섹션 6개
 */

import { HumanIndicatorSection } from "@/components/home";

const SECTION_LABELS = [
  "2. 찐 공포/탐욕 지수",
  "3. 고수/인플루언서 실시간 포지션",
  "4. CVD와 고래 매수/매도 신호",
  "5. 주요 수요/공급망 포지션",
  "6. 매물대 × 청산맵",
] as const;

export default function Home() {
  return (
    <div className="relative w-full">
      {/* 배경 레이어 (홈 메인 전용) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.08),transparent)]" />
      </div>

      {/* 비전 문구 */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-[#3b82f6] sm:text-6xl lg:text-7xl">
          한국 대표 투자 정보 공유 플랫폼을 목표로
        </h1>
      </div>

      {/* 섹션들: 1번 인간 지표 실구현, 나머지 플레이스홀더 */}
      <div className="mx-auto max-w-4xl space-y-6">
        <HumanIndicatorSection />
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
  );
}
