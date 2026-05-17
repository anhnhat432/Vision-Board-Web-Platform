import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDayKey } from "../utils/day-key";
import { getUserData, saveUserData } from "../utils/storage";

vi.mock("../components/ui/count-up", () => ({
  CountUp: ({ value }: { value: number }) => <>{value}</>,
}));

import { ReflectionJournal } from "./ReflectionJournal";

type ReflectionSeed = {
  timestamp: string;
};

function seedReflections(entries: ReflectionSeed[]) {
  const data = getUserData();
  data.reflections = entries.map((entry, index) => ({
    id: `reflection_${index + 1}`,
    date: getDayKey(entry.timestamp),
    title: `Nhật ký ${index + 1}`,
    content: `Nội dung nhật ký ${index + 1}`,
    mood: "happy",
  }));
  saveUserData(data);
}

function renderJournal() {
  const router = createMemoryRouter([{ path: "/journal", element: <ReflectionJournal /> }], {
    initialEntries: ["/journal"],
  });

  return render(<RouterProvider router={router} />);
}

// Note: Streak display was removed in v2 refactoring with app tokens
// Tests are skipped pending UI decision on streak placement
describe("ReflectionJournal streak", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.skip("counts 3 days streak when entries on 3 consecutive days", () => {
    vi.setSystemTime(new Date("2026-05-15T10:00:00+07:00"));
    seedReflections([
      { timestamp: "2026-05-15T08:00:00+07:00" },
      { timestamp: "2026-05-14T20:00:00+07:00" },
      { timestamp: "2026-05-13T22:30:00+07:00" },
    ]);
    renderJournal();
    expect(screen.getByText("3 ngày")).toBeInTheDocument();
  });

  it.skip("resets streak after a skipped day", () => {
    vi.setSystemTime(new Date("2026-05-15T10:00:00+07:00"));
    seedReflections([
      { timestamp: "2026-05-15T08:00:00+07:00" },
      { timestamp: "2026-05-13T22:30:00+07:00" },
    ]);
    renderJournal();
    expect(screen.getByText("1 ngày")).toBeInTheDocument();
  });

  it.skip("does not double-count entries at 23:59 and 00:01 of same calendar day", () => {
    vi.setSystemTime(new Date("2026-05-15T10:00:00+07:00"));
    seedReflections([
      { timestamp: "2026-05-14T23:59:00+07:00" },
      { timestamp: "2026-05-14T00:01:00+07:00" },
    ]);
    renderJournal();
    expect(screen.getByText("1 ngày")).toBeInTheDocument();
  });

  it.skip("counts entries at 23:59 day N and 00:01 day N+1 as 2 separate days", () => {
    vi.setSystemTime(new Date("2026-05-15T10:00:00+07:00"));
    seedReflections([
      { timestamp: "2026-05-15T00:01:00+07:00" },
      { timestamp: "2026-05-14T23:59:00+07:00" },
    ]);
    renderJournal();
    expect(screen.getByText("2 ngày")).toBeInTheDocument();
  });

  it.skip("returns 0 when no reflections", () => {
    vi.setSystemTime(new Date("2026-05-15T10:00:00+07:00"));
    seedReflections([]);
    renderJournal();
    expect(screen.getByText("0 ngày")).toBeInTheDocument();
  });

  it.skip("includes today even if today has no entry yet (allows yesterday-start)", () => {
    vi.setSystemTime(new Date("2026-05-15T10:00:00+07:00"));
    seedReflections([
      { timestamp: "2026-05-14T20:00:00+07:00" },
      { timestamp: "2026-05-13T20:00:00+07:00" },
    ]);
    renderJournal();
    expect(screen.getByText("2 ngày")).toBeInTheDocument();
  });
});
