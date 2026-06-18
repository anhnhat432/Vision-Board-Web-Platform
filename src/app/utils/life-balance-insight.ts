export type LifeAreaScore = {
  name: string;
  score: number;
};

export type FocusInsight = {
  headline: string;
  reason: string;
  tip: string;
};

/**
 * Tính trung bình điểm tất cả lĩnh vực, làm tròn 1 chữ số thập phân.
 */
function computeAverage(allAreas: LifeAreaScore[]): number {
  if (allAreas.length === 0) return 0;
  const sum = allAreas.reduce((acc, a) => acc + a.score, 0);
  return Math.round((sum / allAreas.length) * 10) / 10;
}

/**
 * Định vị tương đối của area trong tập allAreas: có phải thấp nhất / cao nhất không?
 */
function classifyPosition(area: LifeAreaScore, allAreas: LifeAreaScore[]): "lowest" | "highest" | "other" {
  if (allAreas.length === 0) return "other";
  const minScore = Math.min(...allAreas.map((a) => a.score));
  const maxScore = Math.max(...allAreas.map((a) => a.score));
  if (area.score === minScore) return "lowest";
  if (area.score === maxScore) return "highest";
  return "other";
}

/**
 * Sinh headline cá nhân hóa dựa trên vị trí tương đối và điểm số.
 */
function buildHeadline(
  label: string,
  score: number,
  position: ReturnType<typeof classifyPosition>,
  average: number,
): string {
  const avgStr = average.toFixed(1);

  switch (position) {
    case "lowest":
      return `${label} ${score}/10 — đang là lĩnh vực thấp nhất của bạn (trung bình ${avgStr}). Cải thiện ở đây tạo chuyển biến rõ nhất.`;
    case "highest":
      return `${label} ${score}/10 — đang là thế mạnh lớn nhất của bạn. Chọn làm trọng tâm để bứt phá lên tầm cao mới.`;
    case "other":
    default:
      if (score < average) {
        return `${label} ${score}/10 — dưới mức trung bình ${avgStr} của bạn, còn nhiều dư địa để nâng lên.`;
      }
      return `${label} ${score}/10 — trên trung bình ${avgStr}, củng cố thêm để biến thành thế mạnh bền vững.`;
  }
}

// ── Nội dung reason gốc theo lĩnh vực ──────────────────────────────────────

function getAreaReason(areaName: string, score: number): string {
  switch (areaName) {
    case "Career":
      return `Sự nghiệp đang ở ${score}/10đ — khi khía cạnh này lệch nhịp, cảm giác bế tắc và thiếu năng lượng sáng tạo dễ lan sang các lĩnh vực khác.`;
    case "Finance":
      return `Tài chính ở mức ${score}/10đ — bất ổn tiền bạc gây stress thường trực, ảnh hưởng giấc ngủ và sự an tâm trong quan hệ.`;
    case "Health":
      return `Sức khỏe ở ${score}/10đ — đây là nền móng của mọi khía cạnh; khi lung lay, hiệu suất và niềm vui đều suy giảm.`;
    case "Education":
      return `Học tập & Trí tuệ ở ${score}/10đ — thiếu cập nhật kiến thức khiến bạn dễ cảm thấy tụt hậu trước thay đổi.`;
    case "Relationships":
      return `Quan hệ xã hội ở ${score}/10đ — thiếu kết nối chất lượng tạo cảm giác cô đơn và trống trải sâu sắc.`;
    case "Family":
      return `Gia đình ở mức ${score}/10đ — khi mối quan hệ gia đình nguội lạnh, bạn thiếu điểm tựa khi gặp bão giông bên ngoài.`;
    case "Personal Growth":
      return `Phát triển cá nhân ở ${score}/10đ — thiếu kỷ luật nội tâm khiến bạn dễ bị cuốn theo thói quen xấu.`;
    case "Leisure":
      return `Giải trí & Nghỉ ngơi ở ${score}/10đ — làm việc quá sức mà thiếu nghỉ ngơi trọn vẹn dẫn thẳng đến kiệt sức.`;
    default:
      return "Khía cạnh này đang cần sự quan tâm để đưa cuộc sống trở lại cân bằng.";
  }
}

function getAreaTip(areaName: string, score: number): string {
  // Tip gốc làm mặc định, sau đó điều chỉnh câu mở đầu theo dải điểm
  const defaultTip = getDefaultAreaTip(areaName);
  if (score <= 3) {
    return prependToTip(defaultTip, "Rất thấp — ưu tiên phục hồi ngay:");
  }
  if (score <= 6) {
    return prependToTip(defaultTip, "Trung bình — củng cố nền tảng trước:");
  }
  return prependToTip(defaultTip, "Khá tốt — bứt phá và nâng tầm:");
}

function getDefaultAreaTip(areaName: string): string {
  switch (areaName) {
    case "Career":
      return "Thiết lập 1 mục tiêu SMART ngắn hạn cho công việc (tối ưu kỹ năng hoặc hoàn tất dự án tồn đọng) để khơi lại đà tiến.";
    case "Finance":
      return "Lập ngân sách chi tiết 12 tuần, cắt chi tiêu không thiết yếu và xây quỹ khẩn cấp nhỏ để lấy lại cảm giác kiểm soát.";
    case "Health":
      return "Đặt 1 mục tiêu siêu nhỏ (ngủ trước 23h hoặc đi bộ 15 phút/ngày) làm tiêu điểm số 1 chu kỳ này.";
    case "Education":
      return "Dành 20 phút/ngày đọc sách hoặc tham gia khóa học ngắn hạn về kỹ năng đang thiếu.";
    case "Relationships":
      return "Lên lịch hẹn cà phê với 1 người bạn tích cực hoặc giải quyết 1 khúc mắc tồn đọng trong quan hệ gần gũi.";
    case "Family":
      return "Thiết lập thời gian 'không điện thoại' bên người thân, chủ động lắng nghe và chia sẻ nhiều hơn.";
    case "Personal Growth":
      return "Viết nhật ký Stoic hằng ngày hoặc thiền 5 phút để củng cố sức mạnh nội tâm.";
    case "Leisure":
      return "Dành ít nhất nửa ngày cuối tuần rời xa công việc hoàn toàn để theo đuổi sở thích và hồi phục.";
    default:
      return "Bắt đầu bằng 1 hành động nhỏ cụ thể hằng ngày.";
  }
}

/**
 * Thêm câu mở đầu vào tip. Nếu tip đã bắt đầu bằng chữ hoa, chuyển thành chữ thường sau câu mở đầu.
 */
function prependToTip(tip: string, prefix: string): string {
  if (tip.length === 0) return prefix;
  const lowered = tip.charAt(0).toLowerCase() + tip.slice(1);
  return `${prefix} ${lowered}`;
}

// ── Hàm chính ──────────────────────────────────────────────────────────────

/**
 * Tạo insight cá nhân hóa cho một lĩnh vực dựa trên điểm số tương đối
 * so với các lĩnh vực khác.
 *
 * @param area - Lĩnh vực đang xét (có tên và điểm)
 * @param allAreas - Toàn bộ danh sách lĩnh vực để định vị tương đối
 * @param label - Nhãn tiếng Việt của lĩnh vực (vd: "Sự nghiệp", "Tài chính")
 * @returns FocusInsight gồm headline, reason, tip
 */
export function getFocusInsight(area: LifeAreaScore, allAreas: LifeAreaScore[], label: string): FocusInsight {
  const average = computeAverage(allAreas);
  const position = classifyPosition(area, allAreas);

  const headline = buildHeadline(label, area.score, position, average);
  const reason = getAreaReason(area.name, area.score);
  const tip = getAreaTip(area.name, area.score);

  return { headline, reason, tip };
}
