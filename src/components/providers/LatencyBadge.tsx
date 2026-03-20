import { useCallback, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { apiClient } from "@/lib/http/client";

/**
 * Format latency value with appropriate unit.
 * <1000ms → "128ms", <60s → "1.2s", <60m → "2.5m", else → "1.1h"
 */
function formatLatency(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
    return `${(ms / 3_600_000).toFixed(1)}h`;
}

interface LatencyBadgeProps {
    /** Provider base URL to ping */
    baseUrl?: string;
}

/**
 * Self-contained latency badge.
 * Shows a ⚡ icon by default. Click to check latency, then shows the value.
 */
export function LatencyBadge({ baseUrl }: LatencyBadgeProps) {
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [checked, setChecked] = useState(false);

    const check = useCallback(async () => {
        if (!baseUrl || loading) return;
        setLoading(true);
        setError(false);
        setChecked(true);

        const start = performance.now();
        try {
            await apiClient.post(
                "/api-call",
                { method: "GET", url: baseUrl.replace(/\/+$/, "") },
                { timeoutMs: 30000 },
            );
            setLatencyMs(performance.now() - start);
        } catch {
            const elapsed = performance.now() - start;
            if (elapsed < 20000) {
                setLatencyMs(elapsed);
            } else {
                setError(true);
                setLatencyMs(null);
            }
        } finally {
            setLoading(false);
        }
    }, [baseUrl, loading]);

    // Always render — even without baseUrl, just show disabled state
    return (
        <button
            type="button"
            disabled={!baseUrl || loading}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] tabular-nums text-gray-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-default disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-gray-50 disabled:hover:text-gray-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-blue-500 dark:hover:bg-blue-950 dark:hover:text-blue-400"
            onClick={(e) => {
                e.stopPropagation();
                void check();
            }}
            title={baseUrl ? `Check latency: ${baseUrl}` : "No base URL"}
        >
            {loading ? (
                <Loader2 size={12} className="animate-spin" />
            ) : checked && error ? (
                <span className="font-bold text-red-500">✕</span>
            ) : checked && latencyMs !== null ? (
                <span className="font-semibold">{formatLatency(latencyMs)}</span>
            ) : (
                <Zap size={12} />
            )}
        </button>
    );
}
