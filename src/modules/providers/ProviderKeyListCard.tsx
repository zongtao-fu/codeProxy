import type { LucideIcon } from "lucide-react";
import { BarChart2, Loader2, Plus, Settings2, Trash2, Zap } from "lucide-react";
import type { ProviderSimpleConfig } from "@/lib/http/types";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { EmptyState } from "@/modules/ui/EmptyState";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";
import { ProviderStatusBar } from "@/modules/providers/ProviderStatusBar";
import type { KeyStatBucket, StatusBarData } from "@/modules/providers/provider-usage";
import {
  hasDisableAllModelsRule,
  maskApiKey,
  stripDisableAllModelsRule,
} from "@/modules/providers/providers-helpers";
import { formatLatency } from "@/modules/providers/hooks/useProviderLatency";

import { useTranslation } from "react-i18next";

export type ProviderUsageSummaryState = {
  loading: boolean;
  error?: boolean;
  data?: {
    plan_name: string;
    used: number;
    remaining: number;
    total: number;
    unit: string;
    expires_at?: string;
  };
};

export function ProviderUsageSummary({
  summary,
  className,
}: {
  summary?: ProviderUsageSummaryState;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!summary) return null;

  if (summary.loading) {
    return (
      <div
        className={[
          "mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-white/55",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Loader2 size={12} className="animate-spin" />
        <span>{t("providers.usage_loading")}</span>
      </div>
    );
  }

  if (summary.error) {
    return (
      <div
        className={[
          "mt-2 inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {t("providers.load_failed")}
      </div>
    );
  }

  if (!summary.data) return null;

  return (
    <div
      className={[
        "mt-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-white/45">
        <span className="font-semibold text-slate-700 dark:text-white/75">
          {summary.data.plan_name}
        </span>
        {summary.data.expires_at ? (
          <span>
            {t("providers.usage_expires")}: {summary.data.expires_at}
          </span>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums">
        <div className="rounded-lg bg-emerald-50 px-2.5 py-2 dark:bg-emerald-500/10">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {t("providers.usage_remaining")}
          </p>
          <p className="mt-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
            {summary.data.remaining.toFixed(4)}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 px-2.5 py-2 dark:bg-amber-500/10">
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            {t("providers.usage_used")}
          </p>
          <p className="mt-0.5 font-semibold text-amber-700 dark:text-amber-300">
            {summary.data.used.toFixed(4)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-100 px-2.5 py-2 dark:bg-neutral-800">
          <p className="text-[10px] text-slate-500 dark:text-white/50">
            {t("providers.usage_total")}
          </p>
          <p className="mt-0.5 font-semibold text-slate-700 dark:text-white">
            {summary.data.total.toFixed(4)}
          </p>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-slate-500 dark:text-white/40">{summary.data.unit}</p>
    </div>
  );
}

export function ProviderKeyListCard({
  icon: Icon,
  title,
  description,
  items,
  onAdd,
  onEdit,
  onDelete,
  onViewUsage,
  onToggleEnabled,

  getStats,
  getStatusBar,
  getUsageSummary,
  getLatencyEntry,
  checkLatency,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items: ProviderSimpleConfig[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onViewUsage?: (index: number) => void;
  onToggleEnabled?: (index: number, enabled: boolean) => void;
  getStats: (item: ProviderSimpleConfig) => KeyStatBucket;
  getStatusBar: (item: ProviderSimpleConfig) => StatusBarData;
  getUsageSummary?: (item: ProviderSimpleConfig) => ProviderUsageSummaryState | undefined;
  getLatencyEntry?: (key: string) => { latencyMs: number | null; loading: boolean; error: boolean };
  checkLatency?: (key: string, baseUrl: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card
      title={title}
      description={description}
      actions={
        <Button variant="primary" size="sm" onClick={onAdd}>
          <Plus size={14} />
          {t("providers.add_new")}
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState title={t("providers.no_config")} description={t("providers.no_config_desc")} />
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const disabled = hasDisableAllModelsRule(item.excludedModels);
            const headerEntries = Object.entries(item.headers || {});
            const excludedModels = stripDisableAllModelsRule(item.excludedModels);
            const models = item.models || [];
            const stats = getStats(item);
            const statusData = getStatusBar(item);
            const usageSummary = getUsageSummary?.(item);

            return (
              <div
                key={`${item.apiKey}:${idx}`}
                className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Icon size={16} className="text-slate-900 dark:text-white" />
                      <span className="truncate">{item.name || maskApiKey(item.apiKey)}</span>
                      {disabled ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
                          {t("providers.disabled")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
                          {t("providers.enabled")}
                        </span>
                      )}
                      {checkLatency &&
                        (() => {
                          const latencyKey = item.apiKey;
                          const entry = getLatencyEntry?.(latencyKey) ?? {
                            latencyMs: null,
                            loading: false,
                            error: false,
                          };
                          const providerBaseUrl = item.baseUrl || "";
                          return (
                            <span
                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white/60 dark:hover:border-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (providerBaseUrl) checkLatency(latencyKey, providerBaseUrl);
                              }}
                              title={
                                providerBaseUrl
                                  ? `Check latency: ${providerBaseUrl}`
                                  : "No base URL configured"
                              }
                            >
                              {entry.loading ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : entry.error ? (
                                <span className="text-rose-500">×</span>
                              ) : entry.latencyMs !== null ? (
                                <span className="font-medium">
                                  {formatLatency(entry.latencyMs)}
                                </span>
                              ) : (
                                <Zap size={10} />
                              )}
                            </span>
                          );
                        })()}
                    </p>

                    <div className="mt-1 space-y-1 text-xs text-slate-600 dark:text-white/65">
                      <p className="truncate font-mono">apiKey：{maskApiKey(item.apiKey)}</p>
                      <p className="truncate font-mono">baseUrl：{item.baseUrl || "--"}</p>
                      {item.proxyUrl ? (
                        <p className="truncate font-mono">proxyUrl：{item.proxyUrl}</p>
                      ) : null}
                      <p className="tabular-nums">
                        {t("providers.models_label")}: {models.length} ·{" "}
                        {t("providers.excluded_models_label")}: {excludedModels.length} ·{" "}
                        {t("providers.headers_optional")}: {headerEntries.length} ·{" "}
                        {t("providers.success_stats", { count: stats.success })} ·{" "}
                        {t("providers.failed_stats", { count: stats.failure })}
                      </p>
                    </div>

                    {headerEntries.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {headerEntries.map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/75"
                          >
                            <span className="font-semibold">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {models.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {models.map((model) => (
                          <span
                            key={model.name}
                            className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-white dark:bg-white dark:text-neutral-950"
                            title={
                              model.alias && model.alias !== model.name
                                ? `${model.name} => ${model.alias}`
                                : model.name
                            }
                          >
                            {model.alias && model.alias !== model.name
                              ? `${model.name} → ${model.alias}`
                              : model.name}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {excludedModels.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {excludedModels.map((model) => (
                          <span
                            key={model}
                            className="rounded-full bg-rose-600/10 px-2 py-0.5 text-[11px] text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <ProviderUsageSummary summary={usageSummary} />

                    <ProviderStatusBar data={statusData} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onToggleEnabled ? (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-sm font-semibold leading-none text-slate-900 dark:text-white">
                          {t("providers.enable")}
                        </span>
                        <ToggleSwitch
                          checked={!disabled}
                          ariaLabel={t("providers.enable")}
                          onCheckedChange={(enabled) => onToggleEnabled(idx, enabled)}
                        />
                      </div>
                    ) : null}
                    {onViewUsage && item.usageConfig?.url ? (
                      <Button variant="secondary" size="sm" onClick={() => onViewUsage(idx)}>
                        <BarChart2 size={14} />
                        {t("providers.view_usage")}
                      </Button>
                    ) : null}
                    <Button variant="secondary" size="sm" onClick={() => onEdit(idx)}>
                      <Settings2 size={14} />
                      {t("providers.edit")}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(idx)}>
                      <Trash2 size={14} />
                      {t("providers.delete")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
