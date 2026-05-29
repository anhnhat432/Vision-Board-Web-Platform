// Helper phát tiếng chuông Zen chánh niệm bằng Web Audio API trực tiếp
let audioCtx: AudioContext | null = null;

export function playZenBell() {
  try {
    // Chỉ khởi tạo AudioContext khi người dùng tương tác lần đầu
    if (!audioCtx) {
      // biome-ignore lint/suspicious/noExplicitAny: needed for Safari compatibility
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Nếu AudioContext bị tạm dừng do chính sách trình duyệt, hãy tiếp tục
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // 1. Tần số chính (Tần số Solfeggio 528 Hz - Chánh niệm & Tái tạo năng lượng)
    const primaryFreq = 528;

    // 2. Tạo bộ điều khiển âm lượng tổng (Master Gain) để thiết kế Envelope
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    
    // Attack nhanh (0.02s) tạo âm gõ đầu tiên của chuông
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    
    // Decay/Release dài (3s) tạo tiếng ngân ấm áp nhạt dần theo hàm mũ
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
    masterGain.connect(audioCtx.destination);

    // 3. Họa âm chính (Sóng Sin) - Tần số 528 Hz
    const osc1 = audioCtx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(primaryFreq, now);
    
    const gain1 = audioCtx.createGain();
    gain1.gain.setValueAtTime(0.8, now);
    osc1.connect(gain1);
    gain1.connect(masterGain);

    // 4. Họa âm thứ hai (Tạo chiều sâu và độ ngân chuông ấm hơn - Overtone 1.5x)
    const osc2 = audioCtx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(primaryFreq * 1.5, now); // 792 Hz
    
    const gain2 = audioCtx.createGain();
    gain2.gain.setValueAtTime(0.25, now);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    // 5. Họa âm thứ ba (Tạo độ thanh thoát, vang cao - Overtone 2x)
    const osc3 = audioCtx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(primaryFreq * 2.0, now); // 1056 Hz
    
    const gain3 = audioCtx.createGain();
    gain3.gain.setValueAtTime(0.12, now);
    osc3.connect(gain3);
    gain3.connect(masterGain);

    // 6. Phát và tự động giải phóng tài nguyên sau khi tiếng ngân kết thúc
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + 3.1);
    osc2.stop(now + 3.1);
    osc3.stop(now + 3.1);
  } catch (err) {
    console.warn("Trình duyệt không hỗ trợ hoặc chặn Web Audio API: ", err);
  }
}
