import React from "react";

interface AssistantMessageContentProps {
  content: string;
  status?: "streaming" | "complete";
}

export function AssistantMessageContent({ content, status }: AssistantMessageContentProps) {
  // Hàm parse markdown đơn giản sang React Elements để hiển thị tuyệt đẹp
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    const lines = text.split("\n");
    let inList = false;
    let listItems: string[] = [];
    const elements: React.ReactNode[] = [];

    const parseInlineStyles = (inputText: string): React.ReactNode[] => {
      const parts = [];
      let currentIdx = 0;
      
      // Regex tìm **bold**, *italic* hoặc ==highlight==
      const regex = /(\*\*|==|\*)(.*?)\1/g;
      let match;
      
      while ((match = regex.exec(inputText)) !== null) {
        const matchIndex = match.index;
        const [fullMatch, delimiter, innerText] = match;
        
        // Add phần text trước match
        if (matchIndex > currentIdx) {
          parts.push(inputText.substring(currentIdx, matchIndex));
        }
        
        // Add phần text định dạng
        if (delimiter === "**") {
          parts.push(
            <strong key={matchIndex} className="font-bold text-emerald-800 dark:text-emerald-300">
              {innerText}
            </strong>
          );
        } else if (delimiter === "*") {
          parts.push(
            <em key={matchIndex} className="italic text-app-ink-soft">
              {innerText}
            </em>
          );
        } else if (delimiter === "==") {
          parts.push(
            <mark key={matchIndex} className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-1 rounded font-medium">
              {innerText}
            </mark>
          );
        }
        
        currentIdx = matchIndex + fullMatch.length;
      }
      
      if (currentIdx < inputText.length) {
        parts.push(inputText.substring(currentIdx));
      }
      
      return parts.length > 0 ? parts : [inputText];
    };

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key}`} className="list-none pl-1 my-2 space-y-1.5">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[14px]">
                <span className="text-emerald-600 dark:text-emerald-400 mt-1.5 shrink-0 size-1.5 rounded-full bg-emerald-500/80" />
                <span className="flex-1">{parseInlineStyles(item)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check header ###
      if (trimmedLine.startsWith("###")) {
        flushList(i);
        const headerText = trimmedLine.replace(/^###\s*/, "");
        elements.push(
          <h4 key={i} className="text-[15px] font-bold text-emerald-800 dark:text-emerald-400 mt-3.5 mb-1.5 font-serif tracking-wide">
            {parseInlineStyles(headerText)}
          </h4>
        );
        continue;
      }

      // Check header ##
      if (trimmedLine.startsWith("##")) {
        flushList(i);
        const headerText = trimmedLine.replace(/^##\s*/, "");
        elements.push(
          <h3 key={i} className="text-base font-bold text-emerald-900 dark:text-emerald-300 mt-4 mb-2 font-serif tracking-wide border-b border-emerald-500/10 pb-0.5">
            {parseInlineStyles(headerText)}
          </h3>
        );
        continue;
      }

      // Check list item
      const listMatch = line.match(/^(\s*)(-\s*|\*\s*|•\s*)(.*)/);
      if (listMatch) {
        inList = true;
        listItems.push(listMatch[3]);
        continue;
      }

      // Nếu không phải list item nhưng đang ở trong list thì kết thúc list
      if (inList && trimmedLine === "") {
        flushList(i);
        continue;
      }

      if (trimmedLine === "") {
        flushList(i);
        elements.push(<div key={i} className="h-2" />);
        continue;
      }

      // Dòng bình thường
      if (inList) {
        listItems[listItems.length - 1] += "\n" + trimmedLine;
      } else {
        elements.push(
          <p key={i} className="my-1 text-[14.5px] leading-relaxed">
            {parseInlineStyles(line)}
          </p>
        );
      }
    }

    // Flush nốt list cuối cùng
    flushList(lines.length);

    return elements;
  };

  return (
    <div className="font-serif text-app-ink/95 selection:bg-emerald-200/50 leading-relaxed space-y-1.5 break-words">
      {renderFormattedContent(content)}
      {status === "streaming" && (
        <span className="inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400 ml-0.5" />
      )}
    </div>
  );
}
