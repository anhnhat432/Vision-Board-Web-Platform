import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechToText } from "../useSpeechToText";

describe("useSpeechToText Hook", () => {
  const _originalSpeechRecognition = (window as any).SpeechRecognition;
  const _originalWebkitSpeechRecognition = (window as any).webkitSpeechRecognition;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset window recognition properties
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it("should return isSupported as false when browser does not support Speech API", () => {
    const { result } = renderHook(() => useSpeechToText());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.isListening).toBe(false);
  });

  it("should return isSupported as true when window.SpeechRecognition exists", () => {
    (window as any).SpeechRecognition = vi.fn().mockImplementation(function (this: any) {
      this.start = vi.fn();
      this.stop = vi.fn();
      this.abort = vi.fn();
    });

    const { result } = renderHook(() => useSpeechToText());
    expect(result.current.isSupported).toBe(true);
  });

  it("should return isSupported as true when window.webkitSpeechRecognition exists", () => {
    (window as any).webkitSpeechRecognition = vi.fn().mockImplementation(function (this: any) {
      this.start = vi.fn();
      this.stop = vi.fn();
      this.abort = vi.fn();
    });

    const { result } = renderHook(() => useSpeechToText());
    expect(result.current.isSupported).toBe(true);
  });

  it("should call SpeechRecognition start/stop methods correctly", () => {
    const startMock = vi.fn();
    const stopMock = vi.fn();
    const abortMock = vi.fn();

    const MockRecognition = vi.fn().mockImplementation(function (this: any) {
      this.start = startMock;
      this.stop = stopMock;
      this.abort = abortMock;
    });

    (window as any).SpeechRecognition = MockRecognition;

    const { result } = renderHook(() => useSpeechToText());

    // Giả lập trạng thái đang không nghe
    expect(result.current.isListening).toBe(false);

    // Bắt đầu nghe
    act(() => {
      result.current.startListening();
    });
    expect(startMock).toHaveBeenCalledTimes(1);

    // Chuyển sang trạng thái nghe (giả lập recognition trigger start event)
    const instance = MockRecognition.mock.instances[0] as any;
    act(() => {
      if (instance.onstart) instance.onstart();
    });
    expect(result.current.isListening).toBe(true);

    // Dừng nghe
    act(() => {
      result.current.stopListening();
    });
    expect(stopMock).toHaveBeenCalledTimes(1);

    // Chuyển sang trạng thái ngừng nghe (giả lập recognition trigger end event)
    act(() => {
      if (instance.onend) instance.onend();
    });
    expect(result.current.isListening).toBe(false);
  });

  it("should process final and interim speech results correctly", () => {
    const startMock = vi.fn();
    const stopMock = vi.fn();
    const abortMock = vi.fn();
    const onFinalResultMock = vi.fn();

    const MockRecognition = vi.fn().mockImplementation(function (this: any) {
      this.start = startMock;
      this.stop = stopMock;
      this.abort = abortMock;
    });

    (window as any).SpeechRecognition = MockRecognition;

    const { result } = renderHook(() => useSpeechToText({ onFinalResult: onFinalResultMock }));

    act(() => {
      result.current.startListening();
    });

    const instance = MockRecognition.mock.instances[0] as any;
    act(() => {
      if (instance.onstart) instance.onstart();
    });

    // Giả lập kết quả tạm thời (interim result)
    act(() => {
      if (instance.onresult) {
        instance.onresult({
          resultIndex: 0,
          results: [
            {
              isFinal: false,
              0: { transcript: "tôi muốn", confidence: 0.9 },
            },
          ] as any,
        });
      }
    });

    expect(result.current.interimTranscript).toBe("tôi muốn");
    expect(result.current.finalTranscript).toBe("");

    // Giả lập kết quả cuối cùng (final result)
    act(() => {
      if (instance.onresult) {
        instance.onresult({
          resultIndex: 0,
          results: [
            {
              isFinal: true,
              0: { transcript: "tôi muốn tạo mục tiêu", confidence: 0.95 },
            },
          ] as any,
        });
      }
    });

    expect(result.current.interimTranscript).toBe("");
    expect(result.current.finalTranscript).toBe("tôi muốn tạo mục tiêu");
    expect(onFinalResultMock).toHaveBeenCalledWith("tôi muốn tạo mục tiêu");
  });

  it("should handle error events correctly", () => {
    const MockRecognition = vi.fn().mockImplementation(function (this: any) {
      this.start = vi.fn();
      this.stop = vi.fn();
      this.abort = vi.fn();
    });

    (window as any).SpeechRecognition = MockRecognition;

    const { result } = renderHook(() => useSpeechToText());

    act(() => {
      result.current.startListening();
    });

    const instance = MockRecognition.mock.instances[0] as any;
    act(() => {
      if (instance.onstart) instance.onstart();
    });

    // Giả lập lỗi không cấp quyền micro
    act(() => {
      if (instance.onerror) {
        instance.onerror({ error: "not-allowed", message: "Microphone permission denied" });
      }
    });

    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toContain("Micro bị từ chối truy cập");
  });
});
