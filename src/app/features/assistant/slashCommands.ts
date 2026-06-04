export interface SlashCommand {
  command: string;
  description: string;
  icon?: string;
  promptText?: string;
  action?: "clear" | "help" | "audit";
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/today", description: "Xem việc cần làm hôm nay", promptText: "Hôm nay tôi nên làm gì?" },
  { command: "/week", description: "Tóm tắt tuần này", promptText: "Tóm tắt tuần này giúp tôi" },
  { command: "/goals", description: "Liệt kê mục tiêu", promptText: "Liệt kê các mục tiêu của tôi" },
  { command: "/summary", description: "Tóm tắt kế hoạch 12 tuần và mục tiêu", promptText: "Tóm tắt toàn bộ kế hoạch 12 tuần và các mục tiêu hiện tại của tôi" },
  { command: "/stuck", description: "Tìm điểm kẹt và đề xuất hướng xử lý", promptText: "Hãy tìm điểm kẹt, task quá hạn và trở ngại của tôi, sau đó đề xuất hướng xử lý" },
  { command: "/suggest", description: "Gợi ý hành động dựa trên trang hiện tại", promptText: "Dựa vào trang hiện tại tôi đang xem, hãy đề xuất các hành động tiếp theo" },
  { command: "/reflection", description: "Gợi ý reflection cuối tuần", promptText: "Gợi ý reflection cho tôi" },
  { command: "/audit", description: "Xem lịch sử thực thi hành động", action: "audit" },
  { command: "/clear", description: "Xóa lịch sử chat", action: "clear" },
  { command: "/help", description: "Xem các lệnh có sẵn", action: "help" },
];

export function filterCommands(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const query = input.slice(1).toLowerCase();
  if (!query) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((cmd) => cmd.command.slice(1).toLowerCase().startsWith(query));
}

export function getHelpMessage(): string {
  return `**Các lệnh nhanh:**

${SLASH_COMMANDS.map((cmd) => `- **${cmd.command}** - ${cmd.description}`).join("\n")}

Gõ lệnh rồi nhấn Enter để chọn, hoặc sử dụng mũi tên lên/xuống để điều hướng.`;
}
