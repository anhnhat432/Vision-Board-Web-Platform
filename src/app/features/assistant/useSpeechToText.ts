import { useCallback, useEffect, useRef, useState } from "react";

// Khai báo kiểu dữ liệu cho Web Speech API để type-safe
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface UseSpeechToTextOptions {
  onFinalResult?: (text: string) => void;
}

export function useSpeechToText(options?: UseSpeechToTextOptions) {
  const { onFinalResult } = options || {};
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Tự động xoá lỗi sau 4 giây để UI sạch sẽ
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Feature detection an toàn
  const isSupported =
    typeof window !== "undefined" &&
    (Boolean((window as any).SpeechRecognition) || Boolean((window as any).webkitSpeechRecognition));

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition() as ISpeechRecognition;

    recognition.continuous = false; // Nghe theo từng câu ngắn
    recognition.interimResults = true; // Trả kết quả tạm thời
    recognition.lang = "vi-VN"; // Tiếng Việt mặc định

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[SpeechToText] Error:", event.error);
      setIsListening(false);
      setInterimTranscript("");

      switch (event.error) {
        case "not-allowed":
        case "permission-denied":
          setError("Micro bị từ chối truy cập. Vui lòng cho phép micro trong cài đặt trình duyệt.");
          break;
        case "no-speech":
          setError("Không nghe thấy giọng nói. Vui lòng thử lại.");
          break;
        case "network":
          setError("Lỗi kết nối mạng khi nhận diện giọng nói.");
          break;
        case "aborted":
          // Hủy bởi người dùng, không báo lỗi
          break;
        default:
          setError(`Lỗi micro: ${event.error}`);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final) {
        setFinalTranscript((prev) => {
          const next = prev ? `${prev} ${final}` : final;
          if (onFinalResult) {
            onFinalResult(final);
          }
          return next;
        });
        setInterimTranscript("");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // Silent catch
      }
    };
  }, [isSupported, onFinalResult]);

  const startListening = useCallback(async () => {
    if (!isSupported || !recognitionRef.current || isListening) return;

    setError(null);
    setFinalTranscript("");
    setInterimTranscript("");

    // Pre-check: xin quyền mic trực tiếp để chắc chắn browser thực sự cho phép
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Ngắt stream ngay vì chỉ cần kiểm tra quyền
      for (const track of stream.getTracks()) {
        track.stop();
      }
    } catch (micErr: any) {
      console.error("[SpeechToText] Mic permission pre-check failed:", micErr.name, micErr.message);
      if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
        setError("Micro bị từ chối truy cập. Vui lòng tải lại trang (F5) rồi cho phép micro khi trình duyệt hỏi.");
      } else if (micErr.name === "NotFoundError") {
        setError("Không tìm thấy micro. Vui lòng kiểm tra thiết bị micro.");
      } else {
        setError(`Không thể truy cập micro: ${micErr.message || micErr.name}`);
      }
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("[SpeechToText] Start error:", err);
      setError("Không thể khởi động nhận diện giọng nói. Thử tải lại trang.");
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error("[SpeechToText] Stop error:", err);
    }
  }, [isSupported, isListening]);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
