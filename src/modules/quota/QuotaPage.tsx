import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { authFilesApi, quotaApi } from "@/lib/http/apis";
import { useInterval } from "@/hooks/useInterval";
import type { AuthFileItem } from "@/lib/http/types";
import { Button } from "@/modules/ui/Button";
import { useToast } from "@/modules/ui/ToastProvider";
import { QuotaFileCard } from "@/modules/quota/QuotaFileCard";
import { fetchQuota, type QuotaProvider } from "@/modules/quota/quota-fetch";
import {
  normalizeAuthIndexValue,
  resolveAuthProvider,
  type QuotaState,
} from "@/modules/quota/quota-helpers";

// Provider icons
import iconAntigravity from "@/assets/icons/antigravity.svg";
import iconCodex from "@/assets/icons/codex.svg";
import iconGemini from "@/assets/icons/gemini.svg";
import iconKiro from "@/assets/icons/kiro.svg";

/* ─── Provider metadata ─── */
const PROVIDER_META: Record<
  string,
  { label: string; icon: { light: string; dark: string }; descKey: string }
> = {
  antigravity: {
    label: "Antigravity",
    icon: { light: iconAntigravity, dark: iconAntigravity },
    descKey: "m_quota.antigravity_desc",
  },
  codex: {
    label: "Codex",
    icon: { light: iconCodex, dark: iconCodex },
    descKey: "m_quota.codex_desc",
  },
  "gemini-cli": {
    label: "Gemini CLI",
    icon: { light: iconGemini, dark: iconGemini },
    descKey: "m_quota.gemini_cli_desc",
  },
  kiro: {
    label: "Kiro",
    icon: { light: iconKiro, dark: iconKiro },
    descKey: "m_quota.kiro_desc",
  },
};

/* ═══════════════════════════════════════════ */

export function QuotaPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [isPending, startTransition] = useTransition();
  const [files, setFiles] = useState<AuthFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [antigravity, setAntigravity] = useState<Record<string, QuotaState>>({});
  const [codex, setCodex] = useState<Record<string, QuotaState>>({});
  const [geminiCli, setGeminiCli] = useState<Record<string, QuotaState>>({});
  const [kiro, setKiro] = useState<Record<string, QuotaState>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasAutoRefreshed = useRef(false);

  useInterval(() => {
    setNowMs(Date.now());
  }, 30000);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const data = await authFilesApi.list();
      setFiles(Array.isArray(data?.files) ? data.files : []);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("m_quota.load_auth_failed"),
      });
    } finally {
      setLoadingFiles(false);
    }
  }, [notify, t]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const grouped = useMemo(() => {
    const ag: AuthFileItem[] = [],
      cx: AuthFileItem[] = [],
      gm: AuthFileItem[] = [],
      kr: AuthFileItem[] = [];
    files.forEach((f) => {
      const p = resolveAuthProvider(f);
      if (p === "antigravity") ag.push(f);
      if (p === "codex") cx.push(f);
      if (p === "gemini-cli") gm.push(f);
      if (p === "kiro") kr.push(f);
    });
    return { ag, cx, gm, kr };
  }, [files]);

  const refreshOne = useCallback(
    async (type: QuotaProvider, file: AuthFileItem) => {
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
        [name]: {
          status: "loading",
          items: prev[name]?.items ?? [],
          updatedAt: prev[name]?.updatedAt,
        },
      }));
      try {
        const items = await fetchQuota(type, file);
        const rawAuthIndex = (file as any)["auth_index"] ?? file.authIndex;
        const authIndex = normalizeAuthIndexValue(rawAuthIndex);
        if (authIndex) {
          void quotaApi.reconcile(authIndex).catch(() => {});
        }
        setMap((prev) => ({
          ...prev,
          [name]: { status: "success", items, updatedAt: Date.now() },
        }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("m_quota.quota_query_failed");
        setMap((prev) => ({
          ...prev,
          [name]: {
            status: "error",
            items: prev[name]?.items ?? [],
            error: message,
            updatedAt: prev[name]?.updatedAt,
          },
        }));
      }
    },
    [t],
  );

  const refreshAll = useCallback(async () => {
    const tasks: Promise<void>[] = [];
    grouped.ag.forEach((f) => tasks.push(refreshOne("antigravity", f)));
    grouped.cx.forEach((f) => tasks.push(refreshOne("codex", f)));
    grouped.gm.forEach((f) => tasks.push(refreshOne("gemini-cli", f)));
    grouped.kr.forEach((f) => tasks.push(refreshOne("kiro", f)));
    if (!tasks.length) {
      notify({ type: "info", message: t("m_quota.no_queryable_files") });
      return;
    }
    startTransition(() => {
      void Promise.allSettled(tasks);
    });
  }, [grouped, notify, refreshOne, startTransition]);

  /* Auto-refresh on mount */
  useEffect(() => {
    if (loadingFiles || hasAutoRefreshed.current) return;
    const hasFiles =
      grouped.ag.length + grouped.cx.length + grouped.gm.length + grouped.kr.length > 0;
    if (!hasFiles) return;
    hasAutoRefreshed.current = true;
    void refreshAll();
  }, [loadingFiles, grouped, refreshAll]);

  /* ── Render provider section ── */
  const renderSection = (
    type: "antigravity" | "codex" | "gemini-cli" | "kiro",
    list: AuthFileItem[],
    stateMap: Record<string, QuotaState>,
  ) => {
    const meta = PROVIDER_META[type];
    return (
      <section key={type}>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-neutral-800/60">
              <img src={meta.icon.light} alt="" width={14} height={14} className="dark:hidden" />
              <img
                src={meta.icon.dark}
                alt=""
                width={14}
                height={14}
                className="hidden dark:block"
              />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{meta.label}</h3>
            {list.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:bg-neutral-800 dark:text-white/50">
                {list.length}
              </span>
            )}
            <span className="text-[11px] text-slate-400 dark:text-white/35">{t(meta.descKey)}</span>
          </div>
          {list.length > 0 && (
            <button
              type="button"
              onClick={() => void Promise.all(list.map((f) => refreshOne(type, f)))}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-4 text-center dark:border-neutral-800">
            <p className="text-xs text-slate-400 dark:text-white/30">{t("quota.no_matching")}</p>
          </div>
        ) : (
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((file) => (
              <QuotaFileCard
                key={file.name}
                file={file}
                state={stateMap[file.name] ?? { status: "idle", items: [] }}
                nowMs={nowMs}
                onRefresh={() => void refreshOne(type, file)}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          {t("m_quota.title")}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => void refreshAll()}
            disabled={isPending || loadingFiles}
          >
            <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
            {t("m_quota.refresh_all")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadFiles()}
            disabled={loadingFiles}
          >
            <RefreshCw size={13} className={loadingFiles ? "animate-spin" : ""} />
            {t("m_quota.refresh_files")}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loadingFiles && (
        <div className="flex items-center justify-center py-8">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-medium text-slate-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-white/60">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent dark:border-white/50 dark:border-t-transparent" />
            {t("m_quota.loading_files")}
          </div>
        </div>
      )}

      {/* Sections */}
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
