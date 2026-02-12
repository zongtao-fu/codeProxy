import { Suspense, lazy } from "react";
import type { ECBasicOption } from "echarts/types/dist/shared";
import { useTheme } from "@/modules/ui/ThemeProvider";

const ReactECharts = lazy(async () => {
  const mod = await import("echarts-for-react");
  return { default: mod.default };
});

export type EChartEvents = Record<string, (params: unknown, chart: unknown) => void>;

export function EChart({
  option,
  loading = false,
  className,
  onEvents,
  notMerge = false,
}: {
  option: ECBasicOption;
  loading?: boolean;
  className?: string;
  onEvents?: EChartEvents;
  notMerge?: boolean;
}) {
  const {
    state: { mode },
  } = useTheme();

  return (
    <div className={["w-full min-w-0", className].filter(Boolean).join(" ")}>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/70">
            图表加载中...
          </div>
        }
      >
        <ReactECharts
          option={option}
          theme={mode === "dark" ? "dark" : undefined}
          showLoading={loading}
          notMerge={notMerge}
          lazyUpdate
          className="h-full w-full"
          onEvents={onEvents}
        />
      </Suspense>
    </div>
  );
}
