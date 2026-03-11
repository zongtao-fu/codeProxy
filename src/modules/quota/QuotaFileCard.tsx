import { RefreshCw, ShieldAlert } from "lucide-react";
import type { AuthFileItem } from "@/lib/http/types";
import { Button } from "@/modules/ui/Button";
import type { QuotaState } from "@/modules/quota/quota-helpers";
import {
  clampPercent,
  isDisabledAuthFile,
  resolveAuthProvider,
} from "@/modules/quota/quota-helpers";

/* ── Smooth progress bar ── */
function QuotaBar({ percent }: { percent: number | null }) {
  const normalized = percent === null ? null : clampPercent(percent);
  const width = normalized ?? 0;
  const color =
    normalized === null
      ? "bg-slate-300/50 dark:bg-white/10"
      : normalized >= 60
        ? "bg-emerald-500"
        : normalized >= 20
          ? "bg-amber-500"
          : "bg-rose-500";

  return (
    <div className="h-2 w-full rounded-full bg-slate-200/80 dark:bg-neutral-800">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function QuotaFileCard({
  file,
  state,
  onRefresh,
}: {
  file: AuthFileItem;
  state: QuotaState;
  onRefresh: () => void;
}) {
  const provider = resolveAuthProvider(file);
  const disabled = isDisabledAuthFile(file);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950/60">
      {/* ── File header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {file.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-white/55">
            {provider || "--"} · {disabled ? "已禁用" : "已启用"}
            {state.updatedAt
              ? ` · ${new Date(state.updatedAt).toLocaleTimeString()}`
              : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={state.status === "loading"}
          className="shrink-0"
        >
          <RefreshCw
            size={14}
            className={state.status === "loading" ? "animate-spin" : ""}
          />
        </Button>
      </div>

      {/* ── Quota content ── */}
      <div className="mt-3">
        {state.status === "error" ? (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            <span>{state.error || "加载失败"}</span>
          </div>
        ) : state.items.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-400 dark:text-white/40">
            {state.status === "loading" ? "加载中…" : "点击刷新查询额度"}
          </p>
        ) : (
          <div className="space-y-3">
            {state.items.map((item, idx) => (
              <div key={item.label}>
                {idx > 0 && (
                  <div className="mb-3 border-t border-slate-100 dark:border-neutral-800/60" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-white/90">
                    {item.label}
                  </p>
                  <div className="flex items-center gap-2 text-xs tabular-nums text-slate-600 dark:text-white/60">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.percent === null
                        ? "--"
                        : `${Math.round(clampPercent(item.percent))}%`}
                    </span>
                    {item.resetLabel && item.resetLabel !== "--" && (
                      <span className="text-slate-400 dark:text-white/40">
                        {item.resetLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5">
                  <QuotaBar percent={item.percent} />
                </div>
                {item.meta && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                    {item.meta}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
