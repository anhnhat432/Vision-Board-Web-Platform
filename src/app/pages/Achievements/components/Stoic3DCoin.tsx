import { Calendar, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Stoic3DCoinProps {
  achievement: {
    id: string;
    key: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    earnedAt?: string;
  };
  onClose: () => void;
}

// Map các triết lý Stoic cổ điển vào mặt sau của đồng xu dựa trên huy hiệu
const STOIC_QUOTES: Record<string, { latin: string; vietnamese: string; author: string }> = {
  "First Step": {
    latin: "Amor Fati",
    vietnamese: "Yêu thương số phận - Hãy ôm lấy mọi biến cố xảy đến như một chất liệu để trưởng thành.",
    author: "Nietzsche & Stoics",
  },
  "Goal Setter": {
    latin: "Ea Sola Libertas Est",
    vietnamese: "Kỷ luật tự do - Chỉ có người làm chủ được bản thân mới thực sự tự do.",
    author: "Epictetus",
  },
  Achiever: {
    latin: "Viam Inveniam",
    vietnamese: "Trở ngại là con đường - Những gì cản đường bạn sẽ trở thành người dẫn lối cho bạn.",
    author: "Marcus Aurelius",
  },
  "Master Achiever": {
    latin: "Memento Mori",
    vietnamese: "Hãy nhớ cái chết - Hãy trân quý từng ngày sống và hành động như thể đó là ngày cuối cùng.",
    author: "Seneca",
  },
  Visionary: {
    latin: "Sympatheia",
    vietnamese: "Đồng cảm vũ trụ - Mọi sinh mệnh đều liên kết với nhau. Nhìn xa để thấy sự vĩ đại.",
    author: "Marcus Aurelius",
  },
  "Reflective Mind": {
    latin: "Nosce Te Ipsum",
    vietnamese: "Thấu hiểu bản thân - Dành thời gian mỗi tối tự vấn bản thân là phương thuốc cho tâm hồn.",
    author: "Seneca",
  },
  Dedicated: {
    latin: "Ignis Disciplinae",
    vietnamese: "Ngọn lửa kỷ luật - Sự bền bỉ rèn giũa nên một ý chí sắt đá, cháy mãi không lụi tàn.",
    author: "Epictetus",
  },
};

const DEFAULT_QUOTE = {
  latin: "Sapere Aude",
  vietnamese: "Dũng cảm tư duy - Hạnh phúc của cuộc đời phụ thuộc vào chất lượng suy nghĩ của bạn.",
  author: "Marcus Aurelius",
};

// Hàm phát tiếng leng keng kim loại ngân vang bằng Web Audio API
const playMetalChime = () => {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: fallback for older Safari webkitAudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Tạo osc1 cho âm chính thanh tao
    const osc1 = ctx.createOscillator();
    // Tạo osc2 cho âm phụ tạo hài âm ngân vang
    const osc2 = ctx.createOscillator();
    // Tạo gainNode quản lý âm lượng
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    // Tần số kim loại cao A5 (880Hz)
    osc1.frequency.setValueAtTime(880, ctx.currentTime);

    osc2.type = "triangle";
    // Tần số hài âm thứ hai (1760Hz) tạo cảm giác vang
    osc2.frequency.setValueAtTime(1760, ctx.currentTime);

    // Bắt đầu với âm thanh vừa phải để tránh chói
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    // Âm lượng giảm dần cực nhanh theo hàm mũ tạo cảm giác kim loại va chạm leng keng rồi vang nhỏ dần
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();

    osc1.stop(ctx.currentTime + 1.5);
    osc2.stop(ctx.currentTime + 1.5);
  } catch (e) {
    console.warn("Web Audio API not allowed or supported yet", e);
  }
};

export function Stoic3DCoin({ achievement, onClose }: Stoic3DCoinProps) {
  const quote = STOIC_QUOTES[achievement.key] || DEFAULT_QUOTE;
  const coinRef = useRef<HTMLDivElement | null>(null);

  // State quản lý toạ độ xoay của đồng xu (độ)
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentRotationStart = useRef({ x: 0, y: 0 });

  // Thời gian chặn phát âm thanh (throttling)
  const lastSoundTime = useRef<number>(0);

  // Phát âm thanh leng keng một lần khi mở modal
  useEffect(() => {
    const timer = setTimeout(() => {
      playMetalChime();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Hàm kích hoạt tiếng leng keng có giới hạn khoảng thời gian tối thiểu 300ms
  const triggerChime = () => {
    const now = Date.now();
    if (now - lastSoundTime.current > 300) {
      playMetalChime();
      lastSoundTime.current = now;
    }
  };

  // Bắt đầu kéo xoay đồng xu
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    currentRotationStart.current = { x: rotation.x, y: rotation.y };
    triggerChime();
  };

  // Đang di chuột kéo xoay
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStart.current.x;
    const deltaY = clientY - dragStart.current.y;

    // Quy đổi khoảng cách di chuyển thành số độ xoay (nhân hệ số nhạy cảm 0.6)
    const newY = currentRotationStart.current.y + deltaX * 0.6;
    const newX = currentRotationStart.current.x - deltaY * 0.6;

    // Giới hạn trục X để không bị xoay lật ngược hoàn toàn (giới hạn từ -70 đến 70 độ)
    const clampedX = Math.max(-70, Math.min(70, newX));

    setRotation({
      x: clampedX,
      y: newY,
    });

    // Nếu xoay nhanh, phát tiếng leng keng kim loại nhỏ
    if (Math.abs(deltaX) > 40 || Math.abs(deltaY) > 40) {
      triggerChime();
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Hủy sự kiện kéo khi chuột đi ra ngoài window
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation on modal container */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-app-line bg-gradient-to-b from-app-surface to-app-bg shadow-2xl transition-all duration-300 md:max-w-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-app-bg/80 text-app-ink-soft hover:bg-app-line/40 hover:text-app-ink transition-colors"
          aria-label="Đóng bảng xem đồng xu"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center p-6 md:p-8">
          {/* Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-app-accent">
              {!achievement.unlocked && <Lock className="h-3 w-3" />}
              Huy hiệu cổ Stoic
            </span>
            <h2 id="modal-title" className="mt-2 font-serif text-2xl font-semibold leading-tight text-app-ink">
              {achievement.title}
            </h2>
            <p className="mt-2 max-w-sm text-xs text-app-ink-soft">{achievement.description}</p>
          </div>

          {/* Sân khấu hiển thị Đồng xu 3D */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: 3D drag stage */}
          <div
            className="my-8 flex h-64 w-full items-center justify-center select-none cursor-grab active:cursor-grabbing"
            style={{ perspective: "1000px" }}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              handleStart(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleMove(touch.clientX, touch.clientY);
            }}
            onTouchEnd={handleEnd}
          >
            {/* Component Đồng xu 3D thực thụ */}
            <div
              ref={coinRef}
              className="relative h-48 w-48 transition-transform duration-100 ease-out"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
              }}
            >
              {/* CHIỀU DÀY CỦA ĐỒNG XU (3D Rim): Tạo 6 lớp trung gian ghép nối đệm giữa 2 mặt */}
              {["rim-1", "rim-2", "rim-3", "rim-4", "rim-5", "rim-6"].map((layerId, i) => (
                <div
                  key={layerId}
                  className="absolute inset-0 rounded-full border border-amber-900/60 bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950"
                  style={{
                    transform: `translateZ(${-i * 0.8}px)`,
                    opacity: 0.85,
                  }}
                />
              ))}

              {/* MẶT TRƯỚC (Front Face) */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-full border-[6px] border-amber-700 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-800 shadow-xl"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "translateZ(0px)",
                }}
              >
                {/* Viền tròn hoa văn chấm cổ điển */}
                <div className="absolute inset-2 rounded-full border border-dashed border-amber-900/40 opacity-70" />

                {/* Biểu tượng trung tâm */}
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-amber-950/15 text-amber-950 shadow-inner">
                  <span className="text-4xl">🏛️</span>
                </div>

                {/* Tên Latin viết tắt bên dưới */}
                <span className="absolute bottom-6 z-10 font-serif text-[10px] font-bold uppercase tracking-wider text-amber-950/70">
                  {quote.latin.split(" ")[0]}
                </span>
              </div>

              {/* MẶT SAU (Back Face) */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center rounded-full border-[6px] border-amber-700 bg-gradient-to-br from-amber-800 via-amber-700 to-amber-950 p-4 text-center shadow-xl"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg) translateZ(0.5px)",
                }}
              >
                {/* Viền tròn hoa văn chấm cổ điển */}
                <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/20 opacity-40" />

                {/* Khắc triết lý */}
                <h4 className="relative z-10 font-serif text-sm font-bold uppercase tracking-widest text-amber-100">
                  {quote.latin}
                </h4>
                <p className="mt-2 px-2 text-[8px] leading-tight text-amber-200/80 italic max-w-[120px]">
                  &ldquo;{quote.vietnamese}&rdquo;
                </p>
                <span className="mt-1 text-[7px] font-bold uppercase tracking-widest text-amber-400/60">
                  — {quote.author}
                </span>
              </div>
            </div>
          </div>

          {/* Trải nghiệm hướng dẫn */}
          <p className="text-[10px] text-app-ink-muted animate-pulse">
            💡 Kéo thả chuột hoặc vuốt chạm để xoay 3D đồng xu Stoic
          </p>

          {/* Footer thông tin */}
          <div className="mt-6 w-full rounded-xl bg-app-surface/60 border border-app-line/60 p-4">
            <div className="flex items-center justify-between text-xs text-app-ink-soft">
              <span>Trạng thái:</span>
              <span className={`font-semibold ${achievement.unlocked ? "text-app-accent" : "text-amber-600"}`}>
                {achievement.unlocked ? "Đã mở khóa" : "Đang bị khóa"}
              </span>
            </div>

            {achievement.unlocked && achievement.earnedAt && (
              <div className="mt-2 flex items-center justify-between text-xs text-app-ink-soft">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Ngày đạt được:
                </span>
                <span className="font-semibold">
                  {new Date(achievement.earnedAt).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
