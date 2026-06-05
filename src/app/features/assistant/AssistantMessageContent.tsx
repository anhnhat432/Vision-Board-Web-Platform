import React from "react";

interface AssistantMessageContentProps {
  content: string;
  status?: "streaming" | "complete";
}

// Hàm phát hiện văn bản có chứa cú pháp markdown thực sự hay không
const hasMarkdown = (text: string): boolean => {
  if (!text) return false;
  // bold (**), italic (*), highlight (==)
  if (/\*\*|==|\*/.test(text)) return true;
  // list items (- , * , • ) ở đầu dòng
  if (/^\s*(-\s*|\*\s*|•\s*)/m.test(text)) return true;
  // headings (##, ###) ở đầu dòng
  if (/^\s*#{2,3}\s+/m.test(text)) return true;
  return false;
};

export function AssistantMessageContent({ content, status }: AssistantMessageContentProps) {
  // Hàm parse markdown đơn giản sang React Elements để hiển thị tuyệt đẹp
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    // Nếu không chứa markdown thực sự, render dưới dạng text thô trong một tag duy nhất
    if (!hasMarkdown(text)) {
      return (
        <p className="my-1.5 text-[15px] leading-relaxed whitespace-pre-line font-serif text-app-ink/95 tracking-normal">
          {text}
        </p>
      );
    }

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
            <em key={matchIndex} className="italic text-app-ink-soft/90">
              {innerText}
            </em>
          );
        } else if (delimiter === "==") {
          parts.push(
            <mark key={matchIndex} className="bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-300 px-1.5 py-0.5 rounded-md font-medium border border-emerald-500/10">
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
          <ul key={`list-${key}`} className="list-none pl-1.5 my-2.5 space-y-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                <span className="text-emerald-600 dark:text-emerald-400 mt-2 shrink-0 size-1.5 rounded-full bg-emerald-500/80 shadow-xs" />
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
          <h4 key={i} className="text-[15.5px] font-bold text-emerald-850 dark:text-emerald-400 mt-4 mb-2 font-serif tracking-wide leading-snug">
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
          <h3 key={i} className="text-[17px] font-bold text-emerald-900 dark:text-emerald-300 mt-5 mb-2.5 font-serif tracking-wide leading-snug border-b border-emerald-500/10 pb-1">
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
        elements.push(<div key={i} className="h-2.5" />);
        continue;
      }

      // Dòng bình thường
      if (inList) {
        listItems[listItems.length - 1] += "\n" + trimmedLine;
      } else {
        elements.push(
          <p key={i} className="my-1.5 text-[15px] leading-relaxed text-app-ink/95 tracking-normal">
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
    <div className="font-serif text-app-ink/95 antialiased selection:bg-emerald-200/50 leading-relaxed space-y-1.5 break-words">
      {renderFormattedContent(content)}
      {status === "streaming" && (
        <span className="inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400 ml-0.5" />
      )}
    </div>
  );
}dark:bg-emerald-400 ml-0.5" />
      )}
    </div>
  );
}
