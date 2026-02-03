/**
 * AdRailLayout – 전역 3단 레이아웃 (좌 광고 | 메인 | 우 광고)
 *
 * 설계 의도:
 * - 모든 페이지에서 동일한 광고 노출로 수익화 일관성 확보
 * - 데스크톱(lg~): 좌/우 광고 레일 + 중앙 메인
 * - 모바일: 메인만 전체 너비 (광고 영역 숨김)
 */

const AD_RAIL_WIDTH = "min(240px, 18vw)";

export function AdRailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-row">
      {/* 좌측 광고 (데스크톱만) */}
      <aside
        className="hidden shrink-0 lg:block"
        style={{ width: AD_RAIL_WIDTH }}
        aria-label="광고"
      >
        <div className="sticky top-20 flex min-h-[400px] items-center justify-center rounded-sm border border-gray-500/50 bg-muted/20">
          <span className="text-xs text-muted-foreground">광고 영역</span>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>

      {/* 우측 광고 (데스크톱만) */}
      <aside
        className="hidden shrink-0 lg:block"
        style={{ width: AD_RAIL_WIDTH }}
        aria-label="광고"
      >
        <div className="sticky top-20 flex min-h-[400px] items-center justify-center rounded-sm border border-gray-500/50 bg-muted/20">
          <span className="text-xs text-muted-foreground">광고 영역</span>
        </div>
      </aside>
    </div>
  );
}
