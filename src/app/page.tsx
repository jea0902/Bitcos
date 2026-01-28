const strategies = [
  {
    name: "펀딩비 역추세 + 도미넌스 전환",
    summary: "과열 구간에서 역추세 진입 후 도미넌스 전환을 포착",
    assets: "BTC/USDT, ETH/USDT",
    monthlyReturn: "+8.4%",
    annualReturn: "+96%",
    winRate: "58%",
    profitFactor: "2.1",
  },
  {
    name: "공포·탐욕 + MVRV 반전",
    summary: "극단 심리 구간과 MVRV Z-score 반전 신호 활용",
    assets: "BTC/USDT",
    monthlyReturn: "+4.1%",
    annualReturn: "+55%",
    winRate: "62%",
    profitFactor: "1.8",
  },
  {
    name: "고래 CVD + 청산맵 돌파",
    summary: "대규모 체결 흐름과 청산 구간 돌파를 동시 확인",
    assets: "BTC/USDT, SOL/USDT",
    monthlyReturn: "+9.2%",
    annualReturn: "+112%",
    winRate: "54%",
    profitFactor: "2.4",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-zinc-100">
      <header className="mx-auto flex w-[90%] items-center justify-between py-6 sm:w-[80%] lg:w-[70%]">
        <div className="text-lg font-semibold tracking-wide text-white">
          Bitcos
        </div>
        <nav className="flex items-center gap-6 text-sm text-zinc-200">
          <a className="font-semibold text-white" href="/">
            홈
          </a>
          <a className="text-zinc-300 hover:text-white" href="/buffett">
            버핏
          </a>
        </nav>
      </header>

      <main className="mx-auto w-[90%] pb-16 sm:w-[80%] lg:w-[70%]">
        <section className="mt-6">
          <h1 className="text-3xl font-semibold leading-tight text-[#3a7bff] sm:text-4xl">
            코인 특화 데이터로 검증된 전략만 공개합니다
          </h1>
          <p className="mt-3 text-base text-[#f6c45d] sm:text-lg">
            백테스팅 통계로 검증된 전략 3개만 추려 공개합니다.
          </p>
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {strategies.map((strategy) => (
              <article
                key={strategy.name}
                className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {strategy.name}
                    </h2>
                    <p className="mt-2 text-sm text-white/70">
                      {strategy.summary}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#1f3b74] px-3 py-1 text-xs font-semibold text-[#9cc2ff]">
                    검증됨
                  </span>
                </div>

                <div className="mt-4 text-xs text-white/60">
                  적용 자산: <span className="text-white/80">{strategy.assets}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-xs text-white/60">월평균 수익률</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-400">
                      {strategy.monthlyReturn}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-xs text-white/60">연평균 수익률</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-400">
                      {strategy.annualReturn}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-xs text-white/60">승률</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {strategy.winRate}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-xs text-white/60">손익비</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {strategy.profitFactor}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
