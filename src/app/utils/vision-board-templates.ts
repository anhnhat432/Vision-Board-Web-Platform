import type { VisionBoardItem, VisionBoardThemeId } from "./storage-types";

export interface VisionBoardTemplate {
  id: string;
  name: string;
  themeId: VisionBoardThemeId;
  description: string;
  items: Omit<VisionBoardItem, "id">[];
}

export const VISION_BOARD_TEMPLATES: VisionBoardTemplate[] = [
  {
    id: "hoc-tap",
    name: "Trí Tuệ & Khám Phá",
    themeId: "aurora",
    description: "Tập trung nâng cao kiến thức, kỹ năng mới và duy trì thói quen đọc sách.",
    items: [
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=480&h=360&fit=crop&q=80",
        x: 10,
        y: 15,
        width: 220,
        height: 165,
        lifeAreaId: "Education",
        style: { sizePreset: "M", imageFrame: "shadow" }
      },
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=480&h=360&fit=crop&q=80",
        x: 55,
        y: 10,
        width: 220,
        height: 165,
        lifeAreaId: "Education",
        style: { sizePreset: "M", imageFrame: "washi" }
      },
      {
        type: "quote",
        content: "Học không phải là để lấp đầy một cái xô, mà là thắp sáng một ngọn lửa.",
        x: 20,
        y: 50,
        width: 320,
        height: 120,
        style: { sizePreset: "L", quoteFont: "serif" }
      },
      {
        type: "icon",
        content: "Star",
        x: 75,
        y: 55,
        width: 140,
        height: 140,
        style: { sizePreset: "S" }
      }
    ]
  },
  {
    id: "su-nghiep",
    name: "Sự Nghiệp & Đột Phá",
    themeId: "nightsky",
    description: "Lên kế hoạch thăng tiến, làm việc sâu và gặt hái thành tựu lớn.",
    items: [
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=480&h=360&fit=crop&q=80",
        x: 8,
        y: 10,
        width: 220,
        height: 165,
        lifeAreaId: "Career",
        style: { sizePreset: "M", imageFrame: "shadow" }
      },
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=480&h=360&fit=crop&q=80",
        x: 58,
        y: 15,
        width: 220,
        height: 165,
        lifeAreaId: "Career",
        style: { sizePreset: "M", imageFrame: "washi" }
      },
      {
        type: "quote",
        content: "Kỷ luật là chiếc cầu nối giữa mục tiêu và thành công của bạn.",
        x: 18,
        y: 48,
        width: 320,
        height: 120,
        style: { sizePreset: "L", quoteFont: "bold" }
      },
      {
        type: "icon",
        content: "Trophy",
        x: 70,
        y: 50,
        width: 140,
        height: 140,
        style: { sizePreset: "S" }
      }
    ]
  },
  {
    id: "suc-khoe",
    name: "Sức Khỏe & Thân Tâm",
    themeId: "forest",
    description: "Nuôi dưỡng cơ thể khỏe mạnh, rèn luyện thể thao và duy trì sự tĩnh tại.",
    items: [
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=480&h=360&fit=crop&q=80",
        x: 12,
        y: 12,
        width: 220,
        height: 165,
        lifeAreaId: "Health",
        style: { sizePreset: "M", imageFrame: "polaroid" }
      },
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1544367563-121910aa6ccd?w=480&h=360&fit=crop&q=80",
        x: 60,
        y: 8,
        width: 220,
        height: 165,
        lifeAreaId: "Health",
        style: { sizePreset: "M", imageFrame: "shadow" }
      },
      {
        type: "quote",
        content: "Lắng nghe cơ thể bạn, đó là tổ ấm duy nhất bạn có.",
        x: 15,
        y: 52,
        width: 320,
        height: 120,
        style: { sizePreset: "L", quoteFont: "handwriting" }
      },
      {
        type: "icon",
        content: "Heart",
        x: 72,
        y: 55,
        width: 140,
        height: 140,
        style: { sizePreset: "S" }
      }
    ]
  },
  {
    id: "tinh-yeu",
    name: "Tình Yêu & Kết Nối",
    themeId: "sunset",
    description: "Dành thời gian cho gia đình, xây dựng mối quan hệ chân thành và yêu thương.",
    items: [
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=480&h=360&fit=crop&q=80",
        x: 10,
        y: 8,
        width: 220,
        height: 165,
        lifeAreaId: "Relationships",
        style: { sizePreset: "M", imageFrame: "washi" }
      },
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=480&h=360&fit=crop&q=80",
        x: 58,
        y: 12,
        width: 220,
        height: 165,
        lifeAreaId: "Family",
        style: { sizePreset: "M", imageFrame: "polaroid" }
      },
      {
        type: "quote",
        content: "Sự hiện diện là món quà tuyệt vời nhất bạn có thể trao tặng cho người thân yêu.",
        x: 20,
        y: 50,
        width: 320,
        height: 120,
        style: { sizePreset: "L", quoteFont: "serif" }
      },
      {
        type: "icon",
        content: "Sun",
        x: 75,
        y: 52,
        width: 140,
        height: 140,
        style: { sizePreset: "S" }
      }
    ]
  },
  {
    id: "tai-chinh",
    name: "Tài Chính & Thịnh Vượng",
    themeId: "minimal",
    description: "Đạt mục tiêu tài chính, tiết kiệm thông minh và mở rộng các dòng thu nhập.",
    items: [
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=480&h=360&fit=crop&q=80",
        x: 8,
        y: 12,
        width: 220,
        height: 165,
        lifeAreaId: "Finance",
        style: { sizePreset: "M", imageFrame: "shadow" }
      },
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=480&h=360&fit=crop&q=80",
        x: 55,
        y: 15,
        width: 220,
        height: 165,
        lifeAreaId: "Finance",
        style: { sizePreset: "M", imageFrame: "washi" }
      },
      {
        type: "quote",
        content: "Mục tiêu tài chính tốt không chỉ là có bao nhiêu tiền, mà là mở ra bao nhiêu sự lựa chọn.",
        x: 18,
        y: 48,
        width: 320,
        height: 120,
        style: { sizePreset: "L", quoteFont: "bold" }
      },
      {
        type: "icon",
        content: "Zap",
        x: 72,
        y: 52,
        width: 140,
        height: 140,
        style: { sizePreset: "S" }
      }
    ]
  }
];
