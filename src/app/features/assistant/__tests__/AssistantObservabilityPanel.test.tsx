import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantObservabilityPanel } from "../AssistantObservabilityPanel";
import { recordAssistantEvent } from "../assistantObservability";

const ASSISTANT_SURFACE_FILES = [
  "src/app/features/assistant/AssistantPanel.tsx",
  "src/app/features/assistant/AssistantObservabilityPanel.tsx",
];

function seedAssistantEvent(userId: string | null = null) {
  recordAssistantEvent({
    type: "assistant_message_sent",
    userId,
    route: "/test-assistant",
    messageId: "msg_1",
    metadata: { source: "test" },
  });
}

describe("AssistantObservabilityPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens an internal dialog and keeps event history when clear is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    seedAssistantEvent();

    render(<AssistantObservabilityPanel userId={null} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Xóa log sự kiện" }));

    expect(await screen.findByRole("alertdialog", { name: "Xóa toàn bộ event history?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quay lại" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog", { name: "Xóa toàn bộ event history?" })).not.toBeInTheDocument();
    });
    expect(localStorage.getItem("assistant.observability:anon")).not.toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("clears event history only after the internal dialog is confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    seedAssistantEvent();

    render(<AssistantObservabilityPanel userId={null} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Xóa log sự kiện" }));
    await user.click(await screen.findByRole("button", { name: "Xóa event history" }));

    await waitFor(() => {
      expect(localStorage.getItem("assistant.observability:anon")).toBeNull();
    });
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("does not use browser confirm in assistant destructive surfaces", () => {
    const repoRoot = process.cwd();
    const pattern = /window\.confirm\s*\(/g;
    const hits: string[] = [];

    for (const relativePath of ASSISTANT_SURFACE_FILES) {
      const absolutePath = path.resolve(repoRoot, relativePath);
      const content = readFileSync(absolutePath, "utf8");
      const lines = content.split(/\r\n|\r|\n/);
      lines.forEach((line, index) => {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          hits.push(`${relativePath}:${index + 1} ${line.trim()}`);
        }
      });
    }

    expect(hits, `Assistant surfaces must use AlertDialog instead of browser confirm:\n${hits.join("\n")}`).toEqual([]);
  });
});
