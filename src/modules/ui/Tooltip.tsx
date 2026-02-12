import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface TooltipController {
  tooltipId: string;
  show: (content: string) => void;
  hide: () => void;
}

const TooltipContext = createContext<TooltipController | null>(null);

export function TooltipProvider({ children }: PropsWithChildren) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  const show = useCallback((next: string) => {
    setContent(next);
    setOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleAnyScrollOrResize = () => {
      setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleAnyScrollOrResize);
    window.addEventListener("scroll", handleAnyScrollOrResize, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleAnyScrollOrResize);
      window.removeEventListener("scroll", handleAnyScrollOrResize, true);
    };
  }, []);

  const value = useMemo<TooltipController>(() => ({ tooltipId, show, hide }), [hide, show, tooltipId]);

  return (
    <TooltipContext value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex justify-center px-4">
        <div
          id={tooltipId}
          role="tooltip"
          aria-hidden={!open}
          className={[
            "max-w-[calc(100vw-2rem)] rounded-2xl border px-3 py-2 text-sm shadow-lg backdrop-blur",
            "border-slate-200 bg-white/95 text-slate-900 dark:border-neutral-800 dark:bg-neutral-950/90 dark:text-white",
            "motion-reduce:transition-none motion-safe:transition motion-safe:duration-150",
            open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1",
          ].join(" ")}
        >
          <div className="break-words">{content}</div>
        </div>
      </div>
    </TooltipContext>
  );
}

export function useTooltip(): TooltipController {
  const context = use(TooltipContext);
  if (!context) {
    throw new Error("useTooltip 必须在 TooltipProvider 内使用");
  }
  return context;
}

export function OverflowTooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: ReactNode;
  className?: string;
}) {
  const { show, hide, tooltipId } = useTooltip();
  const ref = useRef<HTMLSpanElement | null>(null);

  const tryShow = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const isOverflowing = el.scrollWidth > el.clientWidth;
    if (!isOverflowing) return;
    if (!content.trim()) return;

    show(content);
  }, [content, show]);

  return (
    <span
      ref={ref}
      onMouseEnter={tryShow}
      onMouseLeave={hide}
      onFocus={tryShow}
      onBlur={hide}
      className={className}
      aria-describedby={tooltipId}
    >
      {children}
    </span>
  );
}

