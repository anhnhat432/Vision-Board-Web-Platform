interface AssistantMessageContentProps {
  content: string;
  status?: "streaming" | "complete";
}

export function AssistantMessageContent({ content, status }: AssistantMessageContentProps) {
  const displayContent =
    status === "streaming" ? (
      <>
        {content}
        <span className="animate-pulse">▋</span>
      </>
    ) : (
      content
    );

  return <span className="whitespace-pre-line break-words">{displayContent}</span>;
}
