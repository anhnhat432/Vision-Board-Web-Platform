import type {
  VisionBoardItemStyle,
  VisionBoardSizePreset,
  VisionBoardStickerId,
  VisionBoardThemeId,
} from "./storage-types";

export interface VisionBoardTheme {
  id: VisionBoardThemeId;
  label: string;
  description: string;
  canvasBackground: string;
  gridColor: string;
  accentZone: string;
  textColor: string;
  defaultQuoteFont: NonNullable<VisionBoardItemStyle["quoteFont"]>;
  preview: { gradient: string };
}

export const VISION_BOARD_THEMES: VisionBoardTheme[] = [
  {
    id: "aurora",
    label: "Cực quang",
    description: "Năng lượng buổi sáng dịu nhẹ.",
    canvasBackground:
      "linear-gradient(135deg, rgba(245, 242, 236, 0.95), rgba(232, 240, 236, 0.92), rgba(250, 248, 245, 0.98))",
    gridColor: "rgba(74, 74, 74, 0.08)",
    accentZone: "rgba(47, 93, 80, 0.08)",
    textColor: "#1A1A1A",
    defaultQuoteFont: "serif",
    preview: {
      gradient: "linear-gradient(135deg, #F5F2EC 0%, #E8F0EC 52%, #FAF8F5 100%)",
    },
  },
  {
    id: "sunset",
    label: "Hoàng hôn",
    description: "Hoàng hôn ấm áp và đầy động lực.",
    canvasBackground:
      "linear-gradient(135deg, rgba(251, 146, 60, 0.24), rgba(244, 114, 182, 0.2), rgba(254, 202, 202, 0.24))",
    gridColor: "rgba(154, 52, 18, 0.18)",
    accentZone: "rgba(251, 146, 60, 0.18)",
    textColor: "#7c2d12",
    defaultQuoteFont: "handwriting",
    preview: {
      gradient: "linear-gradient(135deg, #fb923c 0%, #f472b6 58%, #fecaca 100%)",
    },
  },
  {
    id: "forest",
    label: "Rừng xanh",
    description: "Sắc xanh đất giúp tâm trí vững vàng.",
    canvasBackground:
      "linear-gradient(135deg, rgba(20, 83, 45, 0.16), rgba(74, 124, 89, 0.2), rgba(187, 247, 208, 0.22))",
    gridColor: "rgba(21, 128, 61, 0.18)",
    accentZone: "rgba(34, 197, 94, 0.16)",
    textColor: "#14532d",
    defaultQuoteFont: "serif",
    preview: {
      gradient: "linear-gradient(135deg, #14532d 0%, #4a7c59 55%, #bbf7d0 100%)",
    },
  },
  {
    id: "nightsky",
    label: "Trời đêm",
    description: "Bầu trời đêm yên tĩnh để nhìn xa hơn.",
    canvasBackground:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(49, 46, 129, 0.88), rgba(88, 28, 135, 0.82))",
    gridColor: "rgba(255, 255, 255, 0.14)",
    accentZone: "rgba(255, 255, 255, 0.1)",
    textColor: "#f8fafc",
    defaultQuoteFont: "serif",
    preview: {
      gradient: "linear-gradient(135deg, #0f172a 0%, #312e81 58%, #581c87 100%)",
    },
  },
  {
    id: "minimal",
    label: "Tối giản",
    description: "Nền kem tinh gọn cho mục tiêu rõ nét.",
    canvasBackground:
      "linear-gradient(135deg, rgba(250, 247, 237, 1), rgba(241, 245, 249, 0.94), rgba(229, 231, 235, 0.88))",
    gridColor: "rgba(100, 116, 139, 0.16)",
    accentZone: "rgba(148, 163, 184, 0.14)",
    textColor: "#111827",
    defaultQuoteFont: "bold",
    preview: {
      gradient: "linear-gradient(135deg, #faf7ed 0%, #f1f5f9 58%, #e5e7eb 100%)",
    },
  },
  {
    id: "blossom",
    label: "Hoa nở",
    description: "Pastel dịu nhẹ, thêm hoa lá cho board mộng mơ.",
    canvasBackground:
      "linear-gradient(135deg, rgba(252, 231, 243, 0.95), rgba(245, 243, 255, 0.92), rgba(236, 250, 245, 0.95))",
    gridColor: "rgba(219, 112, 147, 0.1)",
    accentZone: "rgba(236, 72, 153, 0.06)",
    textColor: "#4a1942",
    defaultQuoteFont: "handwriting",
    preview: {
      gradient: "linear-gradient(135deg, #fce7f3 0%, #f5f3ff 50%, #ecfaf5 100%)",
    },
  },
  {
    id: "dreamscape",
    label: "Mộng mơ",
    description: "Gradient tím hồng nhẹ, bầu trời dreamy.",
    canvasBackground:
      "linear-gradient(160deg, rgba(243, 232, 255, 0.95), rgba(252, 211, 235, 0.88), rgba(255, 237, 213, 0.9))",
    gridColor: "rgba(168, 85, 247, 0.08)",
    accentZone: "rgba(192, 132, 252, 0.06)",
    textColor: "#3b0764",
    defaultQuoteFont: "serif",
    preview: {
      gradient: "linear-gradient(160deg, #f3e8ff 0%, #fcd3eb 50%, #ffedd5 100%)",
    },
  },
];

export interface QuoteFontStyle {
  id: NonNullable<VisionBoardItemStyle["quoteFont"]>;
  label: string;
  className: string;
  fontFamily?: string;
}

export const QUOTE_FONT_STYLES: QuoteFontStyle[] = [
  {
    id: "default",
    label: "Mặc định",
    className: "font-medium text-slate-700",
  },
  {
    id: "handwriting",
    label: "Viết tay",
    className: "italic text-xl leading-snug",
    fontFamily: '"Caveat", "Patrick Hand", "Segoe Script", cursive',
  },
  {
    id: "serif",
    label: "Cổ điển",
    className: "font-semibold text-lg leading-relaxed",
    fontFamily: '"Source Serif 4 Variable", "Source Serif 4", "Playfair Display", Georgia, serif',
  },
  {
    id: "bold",
    label: "Mạnh mẽ",
    className: "font-black tracking-wider uppercase text-base",
  },
];

export interface ImageFrameStyle {
  id: NonNullable<VisionBoardItemStyle["imageFrame"]>;
  label: string;
  wrapperClassName: string;
  imageClassName: string;
  decorationsLayout?: "polaroid" | "washi" | "scalloped" | "filmstrip" | "watercolor" | null;
}

export const IMAGE_FRAME_STYLES: ImageFrameStyle[] = [
  {
    id: "shadow",
    label: "Đổ bóng",
    wrapperClassName: "rounded-2xl border border-white/85 bg-white/90 p-2 shadow-[var(--shadow-3)]",
    imageClassName: "rounded-xl object-cover",
    decorationsLayout: null,
  },
  {
    id: "polaroid",
    label: "Polaroid",
    wrapperClassName: "rounded-sm border border-white bg-white p-3 pb-8 shadow-xl",
    imageClassName: "rounded-[2px] object-cover",
    decorationsLayout: "polaroid",
  },
  {
    id: "washi",
    label: "Băng dán washi",
    wrapperClassName: "rounded-lg border border-white/80 bg-white/85 p-2 shadow-lg",
    imageClassName: "rounded-md object-cover",
    decorationsLayout: "washi",
  },
  {
    id: "minimal",
    label: "Tối giản",
    wrapperClassName: "rounded-md border border-slate-200",
    imageClassName: "rounded-md object-cover",
    decorationsLayout: null,
  },
  {
    id: "scalloped",
    label: "Lượn sóng",
    wrapperClassName: "rounded-[2rem] border-4 border-dashed border-rose-200/80 bg-white/90 p-2.5 shadow-md",
    imageClassName: "rounded-2xl object-cover",
    decorationsLayout: "scalloped",
  },
  {
    id: "filmstrip",
    label: "Phim nhựa",
    wrapperClassName: "rounded-sm bg-neutral-800 border border-neutral-700 p-2 shadow-lg",
    imageClassName: "rounded-[1px] object-cover",
    decorationsLayout: "filmstrip",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    wrapperClassName: "rounded-xl border border-amber-200/60 p-2 shadow-md",
    imageClassName: "rounded-lg object-cover",
    decorationsLayout: "watercolor",
  },
];

export interface StickerDefinition {
  id: VisionBoardStickerId;
  label: string;
  defaultWidth: number;
}

export const STICKER_DEFS: StickerDefinition[] = [
  { id: "flower-pink", label: "Hoa hồng", defaultWidth: 80 },
  { id: "flower-white", label: "Hoa trắng", defaultWidth: 80 },
  { id: "leaf-green", label: "Lá xanh", defaultWidth: 72 },
  { id: "leaf-gold", label: "Lá vàng", defaultWidth: 72 },
  { id: "star-gold", label: "Sao vàng", defaultWidth: 64 },
  { id: "star-silver", label: "Sao bạc", defaultWidth: 64 },
  { id: "heart-pink", label: "Tim hồng", defaultWidth: 64 },
  { id: "heart-red", label: "Tim đỏ", defaultWidth: 64 },
  { id: "ribbon-pink", label: "Ruy băng", defaultWidth: 100 },
  { id: "confetti", label: "Confetti", defaultWidth: 120 },
];

export interface QuoteBackgroundPreset {
  id: NonNullable<VisionBoardItemStyle["quoteBackground"]>;
  label: string;
}

export const QUOTE_BACKGROUNDS: QuoteBackgroundPreset[] = [
  { id: "none", label: "Mặc định" },
  { id: "dots", label: "Chấm bi" },
  { id: "highlight", label: "Gạch chân nổi bật" },
];

export const SIZE_PRESETS: Record<VisionBoardSizePreset, { width: number; label: string }> = {
  S: { width: 140, label: "Nhỏ" },
  M: { width: 220, label: "Vừa" },
  L: { width: 320, label: "Lớn" },
  XL: { width: 440, label: "Rất lớn" },
};

export interface StoryFeelingOption {
  id: string;
  label: string;
}

export const STORY_FEELING_OPTIONS: StoryFeelingOption[] = [
  { id: "binh-an", label: "Bình an" },
  { id: "manh-me", label: "Mạnh mẽ" },
  { id: "tu-do", label: "Tự do" },
  { id: "ket-noi", label: "Kết nối" },
  { id: "sang-tao", label: "Sáng tạo" },
  { id: "an-toan", label: "An toàn" },
  { id: "thinh-vuong", label: "Thịnh vượng" },
  { id: "tinh-thuc", label: "Tỉnh thức" },
  { id: "but-pha", label: "Bứt phá" },
  { id: "tu-te", label: "Tử tế" },
  { id: "cham-rai", label: "Chậm rãi" },
  { id: "toa-sang", label: "Tỏa sáng" },
];

export interface CuratedQuoteByFeeling {
  feelingId: string;
  quotes: string[];
}

export const CURATED_QUOTES_BY_FEELING: CuratedQuoteByFeeling[] = [
  {
    feelingId: "binh-an",
    quotes: [
      "Bình an đến khi tôi không cần thắng mọi điều, chỉ cần giữ đúng điều quan trọng.",
      "Một ngày đủ yên có thể làm lại cân bằng cho cả tuần dài.",
      "Tôi chọn nói nhỏ hơn, thói quen đều hơn, trái tim rộng hơn.",
    ],
  },
  {
    feelingId: "manh-me",
    quotes: [
      "Mạnh mẽ là biết run nhưng vẫn bước thêm một bước đúng hướng.",
      "Tôi không đợi hết sợ hãi mới làm; tôi làm để nỗi sợ nhỏ lại.",
      "Sức bền được xây bằng những lời hứa nhỏ mình giữ với chính mình.",
    ],
  },
  {
    feelingId: "tu-do",
    quotes: [
      "Tự do không phải là làm gì cũng được, mà là chọn được điều mình thật sự muốn làm.",
      "Đi xa để hiểu mình nhỏ bé, đi gần để biết mình đủ đầy.",
      "Một cuộc đời tự do bắt đầu bằng một thói quen tự kỷ luật.",
    ],
  },
  {
    feelingId: "ket-noi",
    quotes: [
      "Kết nối sâu không cần nhiều lời, chỉ cần mình có mặt thật lòng.",
      "Tôi muốn xây những mối quan hệ nơi cả hai đều được thở thành thật.",
      "Mỗi lần lắng nghe trọn vẹn là một sợi dây được đan lại.",
    ],
  },
  {
    feelingId: "sang-tao",
    quotes: [
      "Sáng tạo là để ý tia sáng nhỏ trước khi nó biến thành ngọn lửa.",
      "Tôi cho phép bản nháp xấu tồn tại để ý tưởng đẹp có đường ra đời.",
      "Mỗi thử nghiệm nhỏ là một câu hỏi đang được trả lời bằng hành động.",
    ],
  },
  {
    feelingId: "an-toan",
    quotes: [
      "An toàn là nền móng để tôi mở rộng, không phải bức tường để tôi ẩn mình.",
      "Tôi chọn những hệ thống giúp mình bình tĩnh khi ngày đổi gió.",
      "Khi gốc rễ được chăm sóc, cành lá có thể lớn lên không vội vã.",
    ],
  },
  {
    feelingId: "thinh-vuong",
    quotes: [
      "Thịnh vượng bắt đầu từ cách tôi tôn trọng từng dòng năng lượng mình có.",
      "Tôi muốn giàu có theo cách có thời gian, sức khỏe và lòng rộng rãi.",
      "Mỗi quyết định sáng suốt hôm nay là một viên gạch cho sự đủ đầy ngày mai.",
    ],
  },
  {
    feelingId: "tinh-thuc",
    quotes: [
      "Tỉnh thức là quay về kịp lúc, trước khi ngày cuốn mình đi qua.",
      "Tôi tập nhìn rõ điều đang có, để không sống bằng những tiếng ồn vay mượn.",
      "Một hơi thở sâu có thể đổi hướng cả một quyết định.",
    ],
  },
  {
    feelingId: "but-pha",
    quotes: [
      "Bứt phá thường bắt đầu như một vết nứt nhỏ trên chiếc trần quen cũ.",
      "Tôi sẵn sàng lớn hơn bản kể chuyện cũ về giới hạn của mình.",
      "Ngày hôm nay cần một hành động đủ rõ để tương lai không còn mờ.",
    ],
  },
  {
    feelingId: "tu-te",
    quotes: [
      "Tử tế với mình là kỷ luật có lòng thương, không phải nuông chiều vô hướng.",
      "Tôi muốn thành công theo cách vẫn nhìn người khác bằng đôi mắt mềm.",
      "Một lời nói dịu dàng có thể giữ lại can đảm cho cả một ngày dài.",
    ],
  },
  {
    feelingId: "cham-rai",
    quotes: [
      "Chậm rãi không phải là chậm tiến, mà là đủ tỉnh để không lạc mình.",
      "Tôi cho những điều bền vững thời gian để chúng mọc rễ.",
      "Nhịp sống tốt là nhịp mình có thể lặp lại mà không đánh mất trái tim.",
    ],
  },
  {
    feelingId: "toa-sang",
    quotes: [
      "Tỏa sáng là đứng trong phần ánh sáng của mình mà không xin lỗi.",
      "Tôi không cần nhỏ lại để người khác thấy dễ chịu hơn.",
      "Khi tôi làm việc bằng sự thật, ánh sáng tự nó tìm được đường ra.",
    ],
  },
];

export interface CuratedImageByLifeArea {
  lifeAreaName: string;
  label: string;
  url: string;
}

export const CURATED_IMAGES_BY_LIFE_AREA: CuratedImageByLifeArea[] = [
  {
    lifeAreaName: "Career",
    label: "Góc làm việc",
    url: "/curated/vision-board/career-goc-lam-viec.webp",
  },
  {
    lifeAreaName: "Career",
    label: "Làm việc sâu",
    url: "/curated/vision-board/career-lam-viec-sau.webp",
  },
  {
    lifeAreaName: "Career",
    label: "Dẫn dắt",
    url: "/curated/vision-board/career-dan-dat.webp",
  },
  {
    lifeAreaName: "Finance",
    label: "Ngân sách",
    url: "/curated/vision-board/finance-ngan-sach.webp",
  },
  {
    lifeAreaName: "Finance",
    label: "Đủ đầy",
    url: "/curated/vision-board/finance-du-day.webp",
  },
  {
    lifeAreaName: "Finance",
    label: "Đầu tư",
    url: "/curated/vision-board/finance-dau-tu.webp",
  },
  {
    lifeAreaName: "Health",
    label: "Vận động",
    url: "/curated/vision-board/health-van-dong.webp",
  },
  {
    lifeAreaName: "Health",
    label: "Thiền",
    url: "/curated/vision-board/health-thien.webp",
  },
  {
    lifeAreaName: "Health",
    label: "Dinh dưỡng",
    url: "/curated/vision-board/health-dinh-duong.webp",
  },
  {
    lifeAreaName: "Education",
    label: "Đọc sách",
    url: "/curated/vision-board/education-doc-sach.webp",
  },
  {
    lifeAreaName: "Education",
    label: "Học nhóm",
    url: "/curated/vision-board/education-hoc-nhom.webp",
  },
  {
    lifeAreaName: "Education",
    label: "Bàn học",
    url: "/curated/vision-board/education-ban-hoc.webp",
  },
  {
    lifeAreaName: "Relationships",
    label: "Trò chuyện",
    url: "/curated/vision-board/relationships-tro-chuyen.webp",
  },
  {
    lifeAreaName: "Relationships",
    label: "Cộng đồng",
    url: "/curated/vision-board/relationships-cong-dong.webp",
  },
  {
    lifeAreaName: "Relationships",
    label: "Nâng đỡ",
    url: "/curated/vision-board/relationships-nang-do.webp",
  },
  {
    lifeAreaName: "Family",
    label: "Tổ ấm",
    url: "/curated/vision-board/family-to-am.webp",
  },
  {
    lifeAreaName: "Family",
    label: "Bữa tối",
    url: "/curated/vision-board/family-bua-toi.webp",
  },
  {
    lifeAreaName: "Family",
    label: "Cuối tuần",
    url: "/curated/vision-board/family-cuoi-tuan.webp",
  },
  {
    lifeAreaName: "Personal Growth",
    label: "Viết nhật ký",
    url: "/curated/vision-board/growth-viet-nhat-ky.webp",
  },
  {
    lifeAreaName: "Personal Growth",
    label: "Suy ngẫm",
    url: "/curated/vision-board/growth-suy-ngam.webp",
  },
  {
    lifeAreaName: "Personal Growth",
    label: "Thực hành",
    url: "/curated/vision-board/growth-thuc-hanh.webp",
  },
  {
    lifeAreaName: "Leisure",
    label: "Du lịch",
    url: "/curated/vision-board/leisure-du-lich.webp",
  },
  {
    lifeAreaName: "Leisure",
    label: "Thiên nhiên",
    url: "/curated/vision-board/leisure-thien-nhien.webp",
  },
  {
    lifeAreaName: "Leisure",
    label: "Nghỉ ngơi sáng tạo",
    url: "/curated/vision-board/leisure-nghi-ngoi-sang-tao.webp",
  },
];
