import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/apiClient";

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
  
  // MediaRecorder refs cho fallback ghi âm
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isWebSpeechFailedRef = useRef(false);
  const isWebSpeechSuccessRef = useRef(false);

  // Tự động xoá lỗi sau 5 giây để UI sạch sẽ
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Hỗ trợ nếu trình duyệt hỗ trợ MediaRecorder HOẶC Web Speech API
  const isSupported =
    typeof window !== "undefined" &&
    (Boolean(navigator.mediaDevices && window.MediaRecorder) ||
     Boolean((window as any).SpeechRecognition) ||
     Boolean((window as any).webkitSpeechRecognition));

  // Kiểm tra xem Web Speech API có khả dụng không
  const isWebSpeechSupported =
    typeof window !== "undefined" &&
    (Boolean((window as any).SpeechRecognition) || Boolean((window as any).webkitSpeechRecognition));

  useEffect(() => {
    if (!isWebSpeechSupported) {
      console.log("[SpeechToText] Web Speech API is not supported. Will use backend transcription.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition() as ISpeechRecognition;

    recognition.continuous = false; // Nghe theo từng câu ngắn
    recognition.interimResults = true; // Trả kết quả tạm thời
    recognition.lang = "vi-VN"; // Tiếng Việt mặc định

    recognition.onstart = () => {
      console.log("[SpeechToText] WebSpeech Recognition started");
      setError(null);
    };

    recognition.onend = () => {
      console.log("[SpeechToText] WebSpeech Recognition ended");
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[SpeechToText] WebSpeech Error:", event.error);

      switch (event.error) {
        case "not-allowed":
        case "permission-denied":
          setError("Micro bị từ chối truy cập. Vui lòng cho phép micro trong cài đặt trình duyệt.");
          setIsListening(false);
          break;
        case "no-speech":
          // Không nói gì, không cần báo lỗi nghiêm trọng
          break;
        case "network":
          // Lỗi kết nối đến server Google, đánh dấu để fallback sang ghi âm backend
          console.warn("[SpeechToText] WebSpeech network error, using backend Whisper fallback");
          isWebSpeechFailedRef.current = true;
          break;
        case "aborted":
          // Hủy bởi người dùng, không báo lỗi
          break;
        default:
          console.warn(`[SpeechToText] WebSpeech warning: ${event.error}`);
          isWebSpeechFailedRef.current = true;
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
        isWebSpeechSuccessRef.current = true; // Ghi nhận Web Speech API thành công
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
  }, [isWebSpeechSupported, onFinalResult]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Trình duyệt của bạn không hỗ trợ ghi âm.");
      return;
    }

    setError(null);
    setFinalTranscript("");
    setInterimTranscript("");
    isWebSpeechFailedRef.current = false;
    isWebSpeechSuccessRef.current = false;
    audioChunksRef.current = [];

    // 1. Xin quyền micro và tạo stream (chỉ khi mediaDevices.getUserMedia tồn tại)
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (micErr: any) {
        console.error("[SpeechToText] Mic permission pre-check failed:", micErr.name, micErr.message);
        if (micErr.name === "NotAllowedError" || micErr.name === "PermissionDeniedError") {
          setError("Micro bị từ chối truy cập. Vui lòng tải lại trang (F5) rồi cho phép micro.");
        } else if (micErr.name === "NotFoundError") {
          setError("Không tìm thấy micro. Vui lòng kiểm tra kết nối thiết bị.");
        } else {
          setError(`Không thể truy cập micro: ${micErr.message || micErr.name}`);
        }
        return;
      }
    }

    // 2. Bắt đầu MediaRecorder ghi âm làm dự phòng (chỉ nếu có stream và MediaRecorder tồn tại)
    if (stream && typeof window.MediaRecorder !== "undefined") {
      try {
        let options = { mimeType: "audio/webm" };
        if (!MediaRecorder.isTypeSupported("audio/webm")) {
          // Safari fallback
          options = { mimeType: "audio/mp4" };
        }

        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(250); // Thu thập data mỗi 250ms
        setIsListening(true);
      } catch (recErr) {
        console.warn("[SpeechToText] Failed to init preferred MediaRecorder, using default options", recErr);
        try {
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (event: any) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          recorder.start();
          setIsListening(true);
        } catch (fallbackErr: any) {
          console.error("[SpeechToText] Basic MediaRecorder failed:", fallbackErr);
          setError("Không thể ghi âm trên thiết bị này.");
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
      }
    } else {
      // Nếu không có stream (môi trường test), set isListening thành true để đồng bộ với Web Speech API
      setIsListening(true);
    }

    // 3. Khởi chạy Web Speech Recognition (nếu hỗ trợ)
    if (isWebSpeechSupported && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("[SpeechToText] WebSpeech start failed. Will fallback to backend.", err);
        isWebSpeechFailedRef.current = true;
      }
    } else {
      isWebSpeechFailedRef.current = true;
    }
  }, [isSupported, isWebSpeechSupported]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;

    // Dừng Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Silent catch
      }
    }

    // Dừng MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = async () => {
        // Tắt microphone stream để tắt đèn micro trình duyệt
        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) {
            track.stop();
          }
          streamRef.current = null;
        }

        // Kiểm tra xem có cần dùng bản ghi âm dịch qua backend không
        const needsBackendFallback = isWebSpeechFailedRef.current || !isWebSpeechSuccessRef.current;

        if (needsBackendFallback && audioChunksRef.current.length > 0) {
          setIsListening(true); // Giữ trạng thái hiển thị "Đang xử lý"
          setInterimTranscript("Đang dịch giọng nói...");

          try {
            const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";
            const extension = mimeType.includes("mp4") ? "mp4" : "webm";
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

            const formData = new FormData();
            formData.append("file", audioBlob, `audio.${extension}`);

            // Gọi API backend
            const result = await apiClient.post<{ text: string }>("/assistant/transcribe", formData);

            if (result && result.text) {
              const text = result.text.trim();
              if (text) {
                setFinalTranscript(text);
                if (onFinalResult) {
                  onFinalResult(text);
                }
              } else {
                setError("Không nhận diện được giọng nói. Thử lại nhé.");
              }
            } else {
              setError("Không nhận diện được giọng nói. Thử lại nhé.");
            }
          } catch (apiErr: any) {
            console.error("[SpeechToText] Backend transcription error:", apiErr);
            const detailMsg = apiErr.message || apiErr;
            setError(`Lỗi xử lý âm thanh từ máy chủ (${detailMsg}). Thử lại nhé.`);
          } finally {
            setIsListening(false);
            setInterimTranscript("");
          }
        } else {
          setIsListening(false);
          setInterimTranscript("");
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("[SpeechToText] Error stopping MediaRecorder:", err);
        setIsListening(false);
      }
    } else {
      // Dọn dẹp stream nếu MediaRecorder không chạy
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
      setIsListening(false);
    }
  }, [isListening, onFinalResult]);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  // Đảm bảo dọn dẹp stream khi unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
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
