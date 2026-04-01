import { describe, expect, test } from "vitest";
import { formatRelativeResetLabel } from "@/modules/quota/quota-helpers";

describe("formatRelativeResetLabel", () => {
  const nowMs = Date.UTC(2026, 3, 1, 12, 0, 0);

  test("formats minute-level remaining time", () => {
    expect(formatRelativeResetLabel(nowMs + 25 * 60 * 1000, nowMs)).toBe(
      "m_quota.minutes_later::25",
    );
  });

  test("formats exact hour remaining time", () => {
    expect(formatRelativeResetLabel(nowMs + 2 * 60 * 60 * 1000, nowMs)).toBe(
      "m_quota.hours_later::2",
    );
  });

  test("formats hour and minute remaining time", () => {
    expect(formatRelativeResetLabel(nowMs + 135 * 60 * 1000, nowMs)).toBe(
      "m_quota.hours_minutes_later::2::15",
    );
  });

  test("marks expired windows as refresh due", () => {
    expect(formatRelativeResetLabel(nowMs - 1, nowMs)).toBe("m_quota.refresh_due");
  });
});
