import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import i18n from "@/i18n";
import { ConfirmModal } from "@/modules/ui/ConfirmModal";

describe("ConfirmModal", () => {
  afterEach(async () => {
    await i18n.changeLanguage("zh-CN");
  });

  test("renders default cancel text when cancelText is omitted", async () => {
    await i18n.changeLanguage("zh-CN");

    render(
      <ConfirmModal
        open
        title="确认删除"
        description="删除此配置？"
        confirmText="删除"
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });
});
