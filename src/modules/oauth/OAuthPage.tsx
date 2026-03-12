import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { oauthApi, vertexApi } from "@/lib/http/apis";
import type { IFlowCookieAuthResponse, OAuthProvider } from "@/lib/http/types";
import { Card } from "@/modules/ui/Card";
import { Button } from "@/modules/ui/Button";
import { TextInput } from "@/modules/ui/Input";
import { useToast } from "@/modules/ui/ToastProvider";

type ProviderStatus = "idle" | "waiting" | "success" | "error";

type ProviderState = {
  url?: string;
  state?: string;
  status?: ProviderStatus;
  error?: string;
  polling?: boolean;
  projectId?: string;
  callbackUrl?: string;
  callbackSubmitting?: boolean;
  callbackStatus?: "success" | "error";
  callbackError?: string;
};

const PROVIDERS: { id: OAuthProvider; title: string; hint: string }[] = [
  { id: "codex", title: "Codex OAuth", hint: "Start authorization workflow, server saves auth file automatically." },
  {
    id: "anthropic",
    title: "Anthropic OAuth",
    hint: "For Claude/Anthropic OAuth Login.",
  },
  {
    id: "antigravity",
    title: "Antigravity OAuth",
    hint: "For Antigravity Quota/Capabilities OAuth Login.",
  },
  {
    id: "gemini-cli",
    title: "Gemini CLI OAuth",
    hint: "Supports optional Project ID; auto-selected by server if empty.",
  },
  { id: "kimi", title: "Kimi OAuth", hint: "If server supports, auth file is auto-saved." },
  { id: "qwen", title: "Qwen OAuth", hint: "If server supports, auth file is auto-saved." },
];

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as any).message === "string"
  ) {
    return String((err as any).message);
  }
  return "";
};

export function OAuthPage() {
  const { notify } = useToast();
  const timers = useRef<Record<string, number>>({});

  const [states, setStates] = useState<Record<OAuthProvider, ProviderState>>(
    {} as Record<OAuthProvider, ProviderState>,
  );
  const [iflowCookie, setIflowCookie] = useState("");
  const [iflowLoading, setIflowLoading] = useState(false);
  const [iflowResult, setIflowResult] = useState<IFlowCookieAuthResponse | null>(null);

  const [vertexFileName, setVertexFileName] = useState("");
  const [vertexLocation, setVertexLocation] = useState("");
  const [vertexLoading, setVertexLoading] = useState(false);
  const [vertexResult, setVertexResult] = useState<{
    projectId?: string;
    email?: string;
    location?: string;
    authFile?: string;
  } | null>(null);

  const clearTimers = useCallback(() => {
    Object.values(timers.current).forEach((timer) => window.clearInterval(timer));
    timers.current = {};
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const updateProviderState = useCallback(
    (provider: OAuthProvider, next: Partial<ProviderState>) => {
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], ...next },
      }));
    },
    [],
  );

  const startPolling = useCallback(
    (provider: OAuthProvider, state: string) => {
      if (timers.current[provider]) {
        window.clearInterval(timers.current[provider]);
      }
      const timer = window.setInterval(async () => {
        try {
          const res = await oauthApi.getAuthStatus(state);
          if (res.status === "ok") {
            updateProviderState(provider, { status: "success", polling: false });
            notify({ type: "success", message: `${provider} Authorization successful` });
            window.clearInterval(timer);
            delete timers.current[provider];
          } else if (res.status === "error") {
            updateProviderState(provider, { status: "error", error: res.error, polling: false });
            notify({ type: "error", message: `${provider} Authorization failed：${res.error || ""}`.trim() });
            window.clearInterval(timer);
            delete timers.current[provider];
          }
        } catch (err: unknown) {
          updateProviderState(provider, {
            status: "error",
            error: getErrorMessage(err),
            polling: false,
          });
          window.clearInterval(timer);
          delete timers.current[provider];
        }
      }, 3000);
      timers.current[provider] = timer;
    },
    [notify, updateProviderState],
  );

  const startAuth = useCallback(
    async (provider: OAuthProvider) => {
      const projectId =
        provider === "gemini-cli" ? (states[provider]?.projectId || "").trim() : undefined;
      updateProviderState(provider, {
        status: "waiting",
        polling: true,
        error: undefined,
        url: "",
        state: "",
        callbackStatus: undefined,
        callbackError: undefined,
      });
      try {
        const res = await oauthApi.startAuth(
          provider,
          provider === "gemini-cli" ? { projectId: projectId || undefined } : undefined,
        );
        updateProviderState(provider, {
          url: res.url,
          state: res.state,
          status: "waiting",
          polling: true,
        });
        if (res.state) {
          startPolling(provider, res.state);
        }
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Failed to start authorization";
        updateProviderState(provider, { status: "error", error: message, polling: false });
        notify({ type: "error", message: `${provider} Failed to start auth: ${message}` });
      }
    },
    [notify, startPolling, states, updateProviderState],
  );

  const copyLink = useCallback(
    async (url?: string) => {
      const link = String(url ?? "").trim();
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link);
        notify({ type: "success", message: "Link copied" });
      } catch {
        notify({ type: "error", message: "Copy failed" });
      }
    },
    [notify],
  );

  const openLink = useCallback((url?: string) => {
    const link = String(url ?? "").trim();
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  }, []);

  const submitCallback = useCallback(
    async (provider: OAuthProvider) => {
      const redirectUrl = (states[provider]?.callbackUrl || "").trim();
      if (!redirectUrl) {
        notify({ type: "info", message: "Please enter callback URL" });
        return;
      }
      updateProviderState(provider, {
        callbackSubmitting: true,
        callbackStatus: undefined,
        callbackError: undefined,
      });
      try {
        await oauthApi.submitCallback(provider, redirectUrl);
        updateProviderState(provider, { callbackSubmitting: false, callbackStatus: "success" });
        notify({ type: "success", message: "Callback submitted successfully" });
      } catch (err: unknown) {
        const message = getErrorMessage(err) || "Callback submission failed";
        updateProviderState(provider, {
          callbackSubmitting: false,
          callbackStatus: "error",
          callbackError: message,
        });
        notify({ type: "error", message });
      }
    },
    [notify, states, updateProviderState],
  );

  const iflowHint = useMemo(() => {
    if (!iflowResult) return "Use iFlow Cookie for one-time auth import.";
    if (iflowResult.status === "ok") return `Import successful：${iflowResult.saved_path || ""}`.trim();
    return `Import failed：${iflowResult.error || ""}`.trim();
  }, [iflowResult]);

  const submitIflow = useCallback(async () => {
    const cookie = iflowCookie.trim();
    if (!cookie) {
      notify({ type: "info", message: "Please enter Cookie" });
      return;
    }
    setIflowLoading(true);
    setIflowResult(null);
    try {
      const res = await oauthApi.iflowCookieAuth(cookie);
      setIflowResult(res);
      notify({
        type: res.status === "ok" ? "success" : "error",
        message: res.status === "ok" ? "Import successful" : res.error || "Import failed",
      });
    } catch (err: unknown) {
      notify({ type: "error", message: getErrorMessage(err) || "Import failed" });
    } finally {
      setIflowLoading(false);
    }
  }, [iflowCookie, notify]);

  const onVertexFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setVertexLoading(true);
      setVertexResult(null);
      setVertexFileName(file.name);
      try {
        const res = await vertexApi.importCredential(file, vertexLocation.trim() || undefined);
        const authFile = (res as any)["auth-file"] ?? (res as any).auth_file;
        setVertexResult({
          projectId: (res as any).project_id,
          email: (res as any).email,
          location: (res as any).location,
          authFile: typeof authFile === "string" ? authFile : undefined,
        });
        notify({ type: "success", message: "Vertex Import successful" });
      } catch (err: unknown) {
        notify({ type: "error", message: getErrorMessage(err) || "Vertex Import failed" });
      } finally {
        setVertexLoading(false);
      }
    },
    [notify, vertexLocation],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const state = states[provider.id] ?? {};
          const status = state.status ?? "idle";
          const disabled = status === "waiting";
          const url = state.url ?? "";
          const polling = Boolean(state.polling);

          return (
            <Card
              key={provider.id}
              title={provider.title}
              description={provider.hint}
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void startAuth(provider.id)}
                  disabled={disabled}
                >
                  {disabled ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  开始授权
                </Button>
              }
            >
              {provider.id === "gemini-cli" ? (
                <div className="mb-3">
                  <TextInput
                    value={state.projectId ?? ""}
                    onChange={(e) =>
                      updateProviderState(provider.id, { projectId: e.currentTarget.value })
                    }
                    placeholder="Project ID(Optional)"
                  />
                </div>
              ) : null}

              <div className="grid min-w-0 gap-3">
                <div className="grid min-w-0 gap-2 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
                      授权链接
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void copyLink(url)}
                        disabled={!url}
                      >
                        <Copy size={14} />
                        复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLink(url)}
                        disabled={!url}
                      >
                        <ExternalLink size={14} />
                        打开
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0 overflow-hidden break-all rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-slate-100">
                    {url ? url : "--"}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-white/65">
                    状态：
                    {polling
                      ? "Polling..."
                      : status === "success"
                        ? "Success"
                        : status === "error"
                          ? "Failed"
                          : "Waiting"}
                    {state.error ? ` · ${state.error}` : ""}
                  </div>
                </div>

                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
                    远程回调提交
                  </p>
                  <TextInput
                    value={state.callbackUrl ?? ""}
                    onChange={(e) =>
                      updateProviderState(provider.id, { callbackUrl: e.currentTarget.value })
                    }
                    placeholder="Paste the full callback URL from browser"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void submitCallback(provider.id)}
                      disabled={Boolean(state.callbackSubmitting)}
                    >
                      <Send size={14} />
                      {state.callbackSubmitting ? "Submitting..." : "Submit Callback"}
                    </Button>
                    {state.callbackStatus ? (
                      <span
                        className={
                          state.callbackStatus === "success"
                            ? "text-xs font-semibold text-emerald-700 dark:text-emerald-200"
                            : "text-xs font-semibold text-rose-700 dark:text-rose-200"
                        }
                      >
                        {state.callbackStatus === "success"
                          ? "Submitted"
                          : state.callbackError || "Submit Failed"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="iFlow Cookie Auth"
          description={iflowHint}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void submitIflow()}
              disabled={iflowLoading}
            >
              <ShieldCheck size={14} />
              {iflowLoading ? "Importing..." : "Import"}
            </Button>
          }
          loading={false}
        >
          <textarea
            value={iflowCookie}
            onChange={(e) => setIflowCookie(e.currentTarget.value)}
            placeholder="Paste Cookie (sent to Management API)"
            className="min-h-[140px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400/35 dark:border-neutral-800 dark:bg-neutral-950 dark:text-slate-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-white/15"
            spellCheck={false}
            aria-label="iFlow Cookie"
          />
        </Card>

        <Card
          title="Vertex Credential Import"
          description="Upload Vertex credentials file to generate auth file."
          actions={
            <label className="inline-flex">
              <input
                type="file"
                className="hidden"
                onChange={(e) => void onVertexFileChange(e.currentTarget.files?.[0] ?? null)}
              />
              <span className="inline-flex">
                <Button variant="secondary" size="sm" disabled={vertexLoading}>
                  <Upload size={14} />
                  {vertexLoading ? "Importing..." : "Select File"}
                </Button>
              </span>
            </label>
          }
        >
          <div className="grid gap-3">
            <TextInput
              value={vertexLocation}
              onChange={(e) => setVertexLocation(e.currentTarget.value)}
              placeholder="location(Optional)"
              endAdornment={<KeyRound size={16} className="text-slate-400" />}
            />
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
                最近导入
              </p>
              <p className="mt-2 font-mono text-xs text-slate-900 dark:text-white">
                File: {vertexFileName || "--"}
              </p>
              {vertexResult ? (
                <div className="mt-2 space-y-1 font-mono text-xs text-slate-700 dark:text-slate-200">
                  <div>project_id：{vertexResult.projectId || "--"}</div>
                  <div>email：{vertexResult.email || "--"}</div>
                  <div>location：{vertexResult.location || "--"}</div>
                  <div>auth_file：{vertexResult.authFile || "--"}</div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600 dark:text-white/65">Not Imported</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
