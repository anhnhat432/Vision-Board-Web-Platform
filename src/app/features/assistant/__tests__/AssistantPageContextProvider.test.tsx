import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AssistantPageContextProvider,
  useAssistantPageContextValue,
  useSetAssistantPageContext,
} from "../AssistantPageContextProvider";

function PageContextText() {
  const value = useAssistantPageContextValue();

  return <div data-testid="page-context">{value?.pageType ?? "none"}</div>;
}

describe("AssistantPageContextProvider", () => {
  it("accepts inline page context values without causing a render loop", () => {
    let renderCount = 0;

    function InlineContextPage() {
      renderCount += 1;
      if (renderCount > 20) {
        throw new Error("Assistant page context render loop");
      }

      useSetAssistantPageContext({
        pageType: "dashboard",
        hint: "Viewing dashboard",
      });

      return <PageContextText />;
    }

    render(
      <AssistantPageContextProvider>
        <InlineContextPage />
      </AssistantPageContextProvider>,
    );

    expect(screen.getByTestId("page-context")).toHaveTextContent("dashboard");
  });
});
