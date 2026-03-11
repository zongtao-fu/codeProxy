import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { apiCallApi, authFilesApi, getApiCallErrorMessage } from "@/lib/http/apis";
import type { ApiCallResult, AuthFileItem } from "@/lib/http/types";
import { Button } from "@/modules/ui/Button";
import { EmptyState } from "@/modules/ui/EmptyState";
import { useToast } from "@/modules/ui/ToastProvider";
import { QuotaFileCard } from "@/modules/quota/QuotaFileCard";
import {
  ANTIGRAVITY_QUOTA_URLS,
  ANTIGRAVITY_REQUEST_HEADERS,
  CODEX_REQUEST_HEADERS,
  CODEX_USAGE_URL,
  DEFAULT_ANTIGRAVITY_PROJECT_ID,
  GEMINI_CLI_QUOTA_URL,
  GEMINI_CLI_REQUEST_HEADERS,
  KIRO_QUOTA_URL,
  KIRO_REQUEST_HEADERS,
  KIRO_REQUEST_BODY,
  buildAntigravityGroups,
  buildCodexItems,
  buildGeminiCliBuckets,
  buildKiroItems,
  clampPercent,
  formatResetTime,
  isRecord,
  normalizeAuthIndexValue,
  normalizeGeminiCliModelId,
  normalizeNumberValue,
  normalizeQuotaFraction,
  normalizeStringValue,
  parseAntigravityPayload,
  parseCodexUsagePayload,
  parseGeminiCliQuotaPayload,
  parseKiroQuotaPayload,
  resolveAuthProvider,
  resolveCodexChatgptAccountId,
  resolveGeminiCliProjectId,
  type AntigravityModelsPayload,
  type QuotaItem,
  type QuotaState,
} from "@/modules/quota/quota-helpers";

/* ─── Provider icons (simple colored dot + label) ─── */
const PROVIDER_META: Record<
  string,
  { label: string; dot: string; description: string }
> = {
  antigravity: {
    label: "Antigravity",
    dot: "bg-emerald-500",
    description: "支持多个 API 端点回退。",
  },
  codex: {
    label: "Codex",
    dot: "bg-orange-500",
    description: "展示 5 小时 / 周限额与代码审查窗口。",
  },
  "gemini-cli": {
    label: "Gemini CLI",
    dot: "bg-blue-500",
    description: "按模型组聚合 bucket 并展示剩余额度。",
  },
  kiro: {
    label: "Kiro",
    dot: "bg-amber-500",
    description: "查询 AWS CodeWhisperer / Kiro 使用额度与重置时间。",
  },
};

/* ─── Resolve Antigravity project ID from file content ─── */
const resolveAntigravityProjectId = async (file: AuthFileItem): Promise<string> => {
  try {
    const text = await authFilesApi.downloadText(file.name);
    const trimmed = text.trim();
    if (!trimmed) return DEFAULT_ANTIGRAVITY_PROJECT_ID;
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const top = normalizeStringValue(parsed.project_id ?? parsed.projectId);
    if (top) return top;

    const installed = isRecord(parsed.installed)
      ? (parsed.installed as Record<string, unknown>)
      : null;
    const installedId = installed
      ? normalizeStringValue(installed.project_id ?? installed.projectId)
      : null;
    if (installedId) return installedId;

    const web = isRecord(parsed.web) ? (parsed.web as Record<string, unknown>) : null;
    const webId = web ? normalizeStringValue(web.project_id ?? web.projectId) : null;
    if (webId) return webId;
  } catch {
    return DEFAULT_ANTIGRAVITY_PROJECT_ID;
  }
  return DEFAULT_ANTIGRAVITY_PROJECT_ID;
};

/* ─── Fetch quota for a single file ─── */
const fetchQuota = async (
  type: "antigravity" | "codex" | "gemini-cli" | "kiro",
  file: AuthFileItem,
): Promise<QuotaItem[]> => {
  const rawAuthIndex = (file as any)["auth_index"] ?? file.authIndex;
  const authIndex = normalizeAuthIndexValue(rawAuthIndex);
  if (!authIndex) {
    throw new Error("缺少 auth_index");
  }

  if (type === "antigravity") {
    const projectId = await resolveAntigravityProjectId(file);
    const requestBody = JSON.stringify({ project: projectId });

    let last: ApiCallResult | null = null;
    for (const url of ANTIGRAVITY_QUOTA_URLS) {
      const result = await apiCallApi.request({
        authIndex,
        method: "POST",
        url,
        header: { ...ANTIGRAVITY_REQUEST_HEADERS },
        data: requestBody,
      });
      last = result;
      if (result.statusCode >= 200 && result.statusCode < 300) {
        const parsed = parseAntigravityPayload(result.body ?? result.bodyText);
        const models = parsed?.models;
        if (!models || !isRecord(models)) {
          throw new Error("未获取到可用模型配额数据");
        }
        const groups = buildAntigravityGroups(models as AntigravityModelsPayload);
        return groups.map((group) => ({
          label: group.label,
          percent: Math.round(clampPercent(group.remainingFraction * 100)),
          resetLabel: group.resetTime ? formatResetTime(group.resetTime) : "--",
        }));
      }
    }
    if (last) {
      throw new Error(getApiCallErrorMessage(last));
    }
    throw new Error("请求失败");
  }

  if (type === "codex") {
    const accountId = resolveCodexChatgptAccountId(file);
    if (!accountId) {
      throw new Error("缺少 Chatgpt-Account-Id（请检查 codex 认证文件是否包含 id_token）");
    }
    const result = await apiCallApi.request({
      authIndex,
      method: "GET",
      url: CODEX_USAGE_URL,
      header: { ...CODEX_REQUEST_HEADERS, "Chatgpt-Account-Id": accountId },
    });
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(getApiCallErrorMessage(result));
    }
    const payload = parseCodexUsagePayload(result.body ?? result.bodyText);
    if (!payload) {
      throw new Error("解析 Codex 配额失败");
    }
    return buildCodexItems(payload);
  }

  if (type === "gemini-cli") {
    const projectId = resolveGeminiCliProjectId(file);
    if (!projectId) {
      throw new Error("缺少 Gemini CLI Project ID（请检查 account 字段）");
    }
    const result = await apiCallApi.request({
      authIndex,
      method: "POST",
      url: GEMINI_CLI_QUOTA_URL,
      header: { ...GEMINI_CLI_REQUEST_HEADERS },
      data: JSON.stringify({ project: projectId }),
    });
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(getApiCallErrorMessage(result));
    }
    const payload = parseGeminiCliQuotaPayload(result.body ?? result.bodyText);
    const buckets = Array.isArray(payload?.buckets) ? payload?.buckets : [];
    const parsed = buckets
      .map((bucket) => {
        const modelId = normalizeGeminiCliModelId(bucket.modelId ?? bucket.model_id);
        if (!modelId) return null;
        const tokenType = normalizeStringValue(bucket.tokenType ?? bucket.token_type);
        const remainingFractionRaw = normalizeQuotaFraction(
          bucket.remainingFraction ?? bucket.remaining_fraction,
        );
        const remainingAmount = normalizeNumberValue(
          bucket.remainingAmount ?? bucket.remaining_amount,
        );
        const resetTime = normalizeStringValue(bucket.resetTime ?? bucket.reset_time) ?? undefined;
        let fallbackFraction: number | null = null;
        if (remainingAmount !== null) {
          fallbackFraction = remainingAmount <= 0 ? 0 : null;
        } else if (resetTime) {
          fallbackFraction = 0;
        }
        const remainingFraction = remainingFractionRaw ?? fallbackFraction;
        return {
          modelId,
          tokenType: tokenType ?? null,
          remainingFraction,
          remainingAmount,
          resetTime,
        };
      })
      .filter(Boolean) as {
        modelId: string;
        tokenType: string | null;
        remainingFraction: number | null;
        remainingAmount: number | null;
        resetTime?: string;
      }[];

    const grouped = buildGeminiCliBuckets(parsed);
    return grouped.map((bucket) => {
      const percent =
        bucket.remainingFraction === null
          ? null
          : Math.round(clampPercent(bucket.remainingFraction * 100));
      const amount =
        bucket.remainingAmount !== null
          ? `${Math.round(bucket.remainingAmount).toLocaleString()} tokens`
          : null;
      const tokenType = bucket.tokenType ? `tokenType=${bucket.tokenType}` : null;
      const meta = [tokenType, amount].filter(Boolean).join(" · ");
      return {
        label: bucket.label,
        percent,
        resetLabel: bucket.resetTime ? formatResetTime(bucket.resetTime) : "--",
        meta: meta || undefined,
      };
    });
  }

  const result = await apiCallApi.request({
    authIndex,
    method: "POST",
    url: KIRO_QUOTA_URL,
    header: { ...KIRO_REQUEST_HEADERS },
    data: KIRO_REQUEST_BODY,
  });
  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(getApiCallErrorMessage(result));
  }
  const payload = parseKiroQuotaPayload(result.body ?? result.bodyText);
  if (!payload) {
    throw new Error("解析 Kiro 配额失败");
  }
  return buildKiroItems(payload);
};

/* ═══════════════════════════════════════════════════════ */

export function QuotaPage() {
  const { notify } = useToast();
  const [isPending, startTransition] = useTransition();

  const [files, setFiles] = useState<AuthFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const [antigravity, setAntigravity] = useState<Record<string, QuotaState>>({});
  const [codex, setCodex] = useState<Record<string, QuotaState>>({});
  const [geminiCli, setGeminiCli] = useState<Record<string, QuotaState>>({});
  const [kiro, setKiro] = useState<Record<string, QuotaState>>({});

  /* Track whether we've auto-refreshed on mount */
  const hasAutoRefreshed = useRef(false);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const data = await authFilesApi.list();
      setFiles(Array.isArray(data?.files) ? data.files : []);
    } catch (err: unknown) {
      notify({ type: "error", message: err instanceof Error ? err.message : "加载认证文件失败" });
    } finally {
      setLoadingFiles(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const grouped = useMemo(() => {
    const ag: AuthFileItem[] = [];
    const cx: AuthFileItem[] = [];
    const gm: AuthFileItem[] = [];
    const kr: AuthFileItem[] = [];
    files.forEach((file) => {
      const provider = resolveAuthProvider(file);
      if (provider === "antigravity") ag.push(file);
      if (provider === "codex") cx.push(file);
      if (provider === "gemini-cli") gm.push(file);
      if (provider === "kiro") kr.push(file);
    });
    return { ag, cx, gm, kr };
  }, [files]);

  const refreshOne = useCallback(
    async (type: "antigravity" | "codex" | "gemini-cli" | "kiro", file: AuthFileItem) => {
      const name = file.name;
      const setMap =
        type === "antigravity"
          ? setAntigravity
          : type === "codex"
            ? setCodex
            : type === "gemini-cli"
              ? setGeminiCli
              : setKiro;

      setMap((prev) => ({
        ...prev,
        [name]: { status: "loading", items: [], updatedAt: Date.now() },
      }));

      try {
        const items = await fetchQuota(type, file);
        setMap((prev) => ({
          ...prev,
          [name]: { status: "success", items, updatedAt: Date.now() },
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "额度查询失败";
        setMap((prev) => ({
          ...prev,
          [name]: { status: "error", items: [], error: message, updatedAt: Date.now() },
        }));
      }
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    const tasks: Promise<void>[] = [];
    grouped.ag.forEach((file) => tasks.push(refreshOne("antigravity", file)));
    grouped.cx.forEach((file) => tasks.push(refreshOne("codex", file)));
    grouped.gm.forEach((file) => tasks.push(refreshOne("gemini-cli", file)));
    grouped.kr.forEach((file) => tasks.push(refreshOne("kiro", file)));

    if (!tasks.length) {
      notify({ type: "info", message: "未发现可查询额度的认证文件" });
      return;
    }

    startTransition(() => {
      void Promise.allSettled(tasks);
    });
  }, [grouped, notify, refreshOne, startTransition]);

  /* ── Auto-refresh quotas once files are loaded ── */
  useEffect(() => {
    if (loadingFiles) return;
    if (hasAutoRefreshed.current) return;
    const hasFiles =
      grouped.ag.length > 0 ||
      grouped.cx.length > 0 ||
      grouped.gm.length > 0 ||
      grouped.kr.length > 0;
    if (!hasFiles) return;
    hasAutoRefreshed.current = true;
    void refreshAll();
  }, [loadingFiles, grouped, refreshAll]);

  /* ── Render a provider section ── */
  const renderSection = (
    type: "antigravity" | "codex" | "gemini-cli" | "kiro",
    list: AuthFileItem[],
    stateMap: Record<string, QuotaState>,
  ) => {
    const meta = PROVIDER_META[type];
    return (
      <section key={type}>
        {/* Section header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`} />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {meta.label}
            </h3>
            {list.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600 dark:bg-neutral-800 dark:text-white/60">
                {list.length}
              </span>
            )}
          </div>
          {list.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void Promise.all(list.map((f) => refreshOne(type, f)))}
            >
              <RefreshCw size={14} />
              刷新
            </Button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-white/50">{meta.description}</p>

        {/* Section content */}
        <div className="mt-3">
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center dark:border-neutral-800">
              <p className="text-sm text-slate-400 dark:text-white/35">
                暂无对应认证文件
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((file) => (
                <QuotaFileCard
                  key={file.name}
                  file={file}
                  state={stateMap[file.name] ?? { status: "idle", items: [] }}
                  onRefresh={() => void refreshOne(type, file)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          配额管理
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => void refreshAll()}
            disabled={isPending || loadingFiles}
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            一键刷新所有额度
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadFiles()}
            disabled={loadingFiles}
          >
            <RefreshCw size={14} className={loadingFiles ? "animate-spin" : ""} />
            刷新文件列表
          </Button>
        </div>
      </div>

      {/* ── Loading state ── */}
      {loadingFiles && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-white/70">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent dark:border-white/50 dark:border-t-transparent" />
            加载认证文件…
          </div>
        </div>
      )}

      {/* ── Provider sections ── */}
      {!loadingFiles && (
        <>
          {renderSection("antigravity", grouped.ag, antigravity)}
          {renderSection("codex", grouped.cx, codex)}
          {renderSection("gemini-cli", grouped.gm, geminiCli)}
          {renderSection("kiro", grouped.kr, kiro)}
        </>
      )}
    </div>
  );
}
