import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import i18n from "@/i18n";
import type { AuthFileItem } from "@/lib/http/types";
import { QuotaFileCard } from "@/modules/quota/QuotaFileCard";

describe("QuotaFileCard", () => {
  afterEach(async () => {
    await i18n.changeLanguage("zh-CN");
  });

  test("keeps previous quota rows visible while loading", async () => {
    await i18n.changeLanguage("en");

    const file: AuthFileItem = {
      name: "codex.json",
      provider: "codex",
      authIndex: "1",
    };

    const { container } = render(
      <QuotaFileCard
        file={file}
        state={{
          status: "loading",
          updatedAt: Date.UTC(2026, 3, 1, 12, 0, 0),
          items: [
            {
              label: "m_quota.code_5h",
              percent: 73,
              resetAtMs: Date.UTC(2026, 3, 1, 13, 30, 0),
            },
          ],
        }}
        nowMs={Date.UTC(2026, 3, 1, 12, 0, 0)}
        onRefresh={() => undefined}
      />,
    );

    expect(screen.getByText("Code: 5h")).toBeInTheDocument();
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getByText("in 1 hours 30 minutes")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();

    const spinner = container.querySelector("button svg");
    expect(spinner?.classList.contains("animate-spin")).toBe(true);
  });
});
