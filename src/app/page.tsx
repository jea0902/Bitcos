/**
 * Bitcos 홈 메인 (1차 MVP)
 *
 * 설계 의도:
 * - 서비스 소개 및 비전 제시
 * - 타이틀과 부제로 서비스의 핵심 가치 전달
 * - 매매법 카드 3개로 예시 제공
 * - 버핏원픽과 동일한 디자인 스타일 적용
 * - Deep Dark 테마 유지
 */

import { StrategyCard } from "@/components/home";

// 매매법 데이터 타입
interface Strategy {
  id: string;
  name: string;
  backtestingPeriod: string;
  monthlyReturn: string;
  annualReturn: string;
  winRate: string;
  profitLossRatio: string;
  colorTheme: "blue" | "amber" | "green";
}

// 더미 매매법 데이터
const DUMMY_STRATEGIES: Strategy[] = [
  {
    id: "1",
    name: "매매법 1",
    backtestingPeriod: "2020.01 ~ 2024.12 (5년)",
    monthlyReturn: "+3.2%",
    annualReturn: "+42.5%",
    winRate: "68.5%",
    profitLossRatio: "2.8:1",
    colorTheme: "blue",
  },
  {
    id: "2",
    name: "매매법 2",
    backtestingPeriod: "2019.06 ~ 2024.12 (5.5년)",
    monthlyReturn: "+4.1%",
    annualReturn: "+58.3%",
    winRate: "72.3%",
    profitLossRatio: "3.2:1",
    colorTheme: "amber",
  },
  {
    id: "3",
    name: "매매법 3",
    backtestingPeriod: "2021.01 ~ 2024.12 (4년)",
    monthlyReturn: "+2.8%",
    annualReturn: "+38.7%",
    winRate: "65.2%",
    profitLossRatio: "2.5:1",
    colorTheme: "green",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full">
      {/* 배경 그라데이션 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.15),transparent)]" />
      </div>

      {/* 메인 콘텐츠 (좌우 15% 여백) */}
      <div className="mx-auto w-[70%] px-4 py-12">
        {/* 헤드라인 */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-[#3b82f6] sm:text-6xl lg:text-7xl">
            실효적 데이터/통계로 검증된 코인 매매법
          </h1>
          <p className="text-xl font-medium text-[#fbbf24] sm:text-2xl lg:text-3xl">
            감정 대신 수학적 통계로 투자하세요!<br />
            유효한 지표들로 백테스팅이 끝난 전략을 떠먹여 드립니다
          </p>
        </div>

        {/* 매매법 카드 그리드 (3개) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DUMMY_STRATEGIES.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </div>
      </div>
    </div>
  );
}
