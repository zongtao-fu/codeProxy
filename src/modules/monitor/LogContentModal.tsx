import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/modules/ui/Modal";
import { usageApi } from "@/lib/http/apis";
import { Loader2, FileInput, FileOutput } from "lucide-react";

interface LogContentModalProps {
    open: boolean;
    logId: number | null;
    /** Which tab to show initially: "input" or "output" */
    initialTab?: "input" | "output";
    onClose: () => void;
}

/**
 * Renders a single chat message in a styled block.
 * Supports roles: system, user, assistant, tool.
 */
function MessageBlock({
    role,
    content,
}: {
    role: string;
    content: string;
}) {
    const roleConfig: Record<
        string,
        { label: string; icon: string; color: string; bg: string }
    > = {
        system: {
            label: "系统提示词",
            icon: "⚙️",
            color: "text-purple-700 dark:text-purple-300",
            bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50",
        },
        user: {
            label: "用户消息",
            icon: "👤",
            color: "text-sky-700 dark:text-sky-300",
            bg: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50",
        },
        assistant: {
            label: "模型回复",
            icon: "🤖",
            color: "text-emerald-700 dark:text-emerald-300",
            bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
        },
        tool: {
            label: "工具结果",
            icon: "🔧",
            color: "text-amber-700 dark:text-amber-300",
            bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
        },
    };

    const config = roleConfig[role] || {
        label: role,
        icon: "💬",
        color: "text-slate-700 dark:text-slate-300",
        bg: "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/50",
    };

    return (
        <div className={`rounded-xl border p-4 ${config.bg}`}>
            <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${config.color}`}>
                <span>{config.icon}</span>
                <span>{config.label}</span>
            </div>
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {content}
            </div>
        </div>
    );
}

/**
 * Extract text content from a message's content field, handling both
 * string and array<{type, text}> formats.
 */
function extractTextContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .filter((part: Record<string, unknown>) => part.type === "text" && typeof part.text === "string")
            .map((part: Record<string, unknown>) => part.text as string)
            .join("\n");
    }
    if (content && typeof content === "object") {
        return JSON.stringify(content, null, 2);
    }
    return String(content ?? "");
}

/**
 * Try to parse OpenAI-style messages from the input payload JSON.
 * Returns an array of {role, content} objects, or null if parsing fails.
 */
function parseMessages(json: string): Array<{ role: string; content: string }> | null {
    try {
        const data = JSON.parse(json);
        // OpenAI format: { messages: [...] }
        const messages = data.messages;
        if (!Array.isArray(messages)) return null;
        return messages
            .filter((m: Record<string, unknown>) => m.role && m.content !== undefined)
            .map((m: Record<string, unknown>) => ({
                role: String(m.role),
                content: extractTextContent(m.content),
            }));
    } catch {
        return null;
    }
}

/**
 * Try to extract the assistant's response text from the output payload JSON.
 * Supports OpenAI format: { choices: [{ message: { content } }] }
 * and Claude format: { content: [{ text }] }
 */
function parseOutputContent(json: string): string | null {
    try {
        const data = JSON.parse(json);
        // OpenAI format
        const choices = data.choices;
        if (Array.isArray(choices) && choices.length > 0) {
            const message = choices[0]?.message;
            if (message?.content) return extractTextContent(message.content);
        }
        // Claude format
        if (Array.isArray(data.content)) {
            return extractTextContent(data.content);
        }
        // Gemini format
        const candidates = data.candidates || data.response?.candidates;
        if (Array.isArray(candidates) && candidates.length > 0) {
            const parts = candidates[0]?.content?.parts;
            if (Array.isArray(parts)) {
                return parts.map((p: Record<string, unknown>) => p.text || "").join("\n");
            }
        }
        return null;
    } catch {
        return null;
    }
}

export function LogContentModal({
    open,
    logId,
    initialTab = "input",
    onClose,
}: LogContentModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputContent, setInputContent] = useState("");
    const [outputContent, setOutputContent] = useState("");
    const [model, setModel] = useState("");
    const [activeTab, setActiveTab] = useState<"input" | "output">(initialTab);

    // Reset tab when initialTab changes
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab, logId]);

    const fetchContent = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await usageApi.getLogContent(id);
            setInputContent(result.input_content || "");
            setOutputContent(result.output_content || "");
            setModel(result.model || "");
        } catch (err) {
            setError(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open && logId) {
            fetchContent(logId);
        }
    }, [open, logId, fetchContent]);

    const renderInput = () => {
        if (!inputContent) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30">
                    <FileInput size={40} className="mb-3 opacity-40" />
                    <p className="text-sm">暂无输入内容记录</p>
                </div>
            );
        }

        // Try to parse as messages array
        const messages = parseMessages(inputContent);
        if (messages && messages.length > 0) {
            return (
                <div className="space-y-3">
                    {messages.map((msg, idx) => (
                        <MessageBlock key={idx} role={msg.role} content={msg.content} />
                    ))}
                </div>
            );
        }

        // Fallback: try to format as JSON, otherwise plain text
        try {
            const formatted = JSON.stringify(JSON.parse(inputContent), null, 2);
            return (
                <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-200">
                    {formatted}
                </pre>
            );
        } catch {
            return (
                <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-200">
                    {inputContent}
                </pre>
            );
        }
    };

    const renderOutput = () => {
        if (!outputContent) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-white/30">
                    <FileOutput size={40} className="mb-3 opacity-40" />
                    <p className="text-sm">暂无输出内容记录</p>
                </div>
            );
        }

        // Try to parse assistant response
        const assistantText = parseOutputContent(outputContent);
        if (assistantText) {
            return (
                <div className="space-y-3">
                    <MessageBlock role="assistant" content={assistantText} />
                </div>
            );
        }

        // Fallback: formatted JSON
        try {
            const formatted = JSON.stringify(JSON.parse(outputContent), null, 2);
            return (
                <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-200">
                    {formatted}
                </pre>
            );
        } catch {
            return (
                <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-200">
                    {outputContent}
                </pre>
            );
        }
    };

    return (
        <Modal
            open={open}
            title={`消息内容${model ? ` · ${model}` : ""}`}
            description="请求/响应的消息详情"
            onClose={onClose}
        >
            {/* Tab switcher */}
            <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-neutral-900">
                <button
                    type="button"
                    onClick={() => setActiveTab("input")}
                    className={[
                        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                        activeTab === "input"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                            : "text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/70",
                    ].join(" ")}
                >
                    <FileInput size={15} />
                    输入消息
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("output")}
                    className={[
                        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                        activeTab === "output"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                            : "text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/70",
                    ].join(" ")}
                >
                    <FileOutput size={15} />
                    输出内容
                </button>
            </div>

            {/* Content area */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-slate-400 dark:text-white/40" />
                    <span className="ml-3 text-sm text-slate-500 dark:text-white/50">加载中…</span>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                </div>
            ) : (
                <div className="min-h-[200px]">
                    {activeTab === "input" ? renderInput() : renderOutput()}
                </div>
            )}
        </Modal>
    );
}
