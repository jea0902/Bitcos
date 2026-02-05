-- =============================================
-- 004: 보팅맨 7단계 - 시장별 시즌 통계·MMR·티어
-- 실행 순서: 002, 003 적용 후 본 파일 실행
-- =============================================

-- 시장 그룹: btc | us | kr (티어/MMR은 3개 시장별)
-- season_id: '2025-1', '2025-2', '2025-3' (연 3등분)

CREATE TABLE IF NOT EXISTS public.user_season_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    market TEXT NOT NULL,
    season_id TEXT NOT NULL,
    placement_matches_played INTEGER NOT NULL DEFAULT 0,
    placement_done BOOLEAN NOT NULL DEFAULT false,
    season_win_count INTEGER NOT NULL DEFAULT 0,
    season_total_count INTEGER NOT NULL DEFAULT 0,
    mmr NUMERIC(20, 4) NOT NULL DEFAULT 0,
    prev_season_mmr NUMERIC(20, 4),
    tier TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT user_season_stats_pkey PRIMARY KEY (id),
    CONSTRAINT user_season_stats_user_market_season_unique UNIQUE (user_id, market, season_id),
    CONSTRAINT user_season_stats_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT user_season_stats_market_check CHECK (market IN ('btc', 'us', 'kr')),
    CONSTRAINT user_season_stats_tier_check CHECK (
        tier IS NULL OR tier IN ('gold', 'platinum', 'diamond', 'master', 'challenger')
    )
);

COMMENT ON TABLE public.user_season_stats IS '보팅맨 시장별 시즌 통계: 배치 5판, 승률, MMR, 티어 (7단계)';
COMMENT ON COLUMN public.user_season_stats.market IS '시장 그룹: btc, us, kr';
COMMENT ON COLUMN public.user_season_stats.season_id IS '시즌 ID 예: 2025-1 (1~4월), 2025-2 (5~8월), 2025-3 (9~12월)';
COMMENT ON COLUMN public.user_season_stats.placement_matches_played IS '해당 시장·시즌에서 정산된 폴 중 참여한 횟수';
COMMENT ON COLUMN public.user_season_stats.placement_done IS '배치 5판 이상 완료 여부';
COMMENT ON COLUMN public.user_season_stats.season_win_count IS '당첨 횟수 (무효판 제외)';
COMMENT ON COLUMN public.user_season_stats.season_total_count IS '참여 횟수 (무효판 제외)';
COMMENT ON COLUMN public.user_season_stats.mmr IS 'MMR = 보유 코인 × 시즌 누적 승률 (배치 보정 적용)';
COMMENT ON COLUMN public.user_season_stats.prev_season_mmr IS '이전 시즌 MMR (배치 보정용)';
COMMENT ON COLUMN public.user_season_stats.tier IS 'gold | platinum | diamond | master | challenger (배치 완료자만)';

CREATE INDEX IF NOT EXISTS idx_user_season_stats_user ON public.user_season_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_season_stats_market_season ON public.user_season_stats(market, season_id);
CREATE INDEX IF NOT EXISTS idx_user_season_stats_mmr ON public.user_season_stats(market, season_id, mmr DESC);

ALTER TABLE public.user_season_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own season stats"
    ON public.user_season_stats FOR SELECT
    USING (user_id = auth.uid());

-- INSERT/UPDATE는 서버(배치·API)만 수행; 서비스 롤 또는 cron에서 upsert
-- 필요 시: CREATE POLICY "Service role can manage season stats" ...
