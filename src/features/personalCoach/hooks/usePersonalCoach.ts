import type {
  CoachRecommendation,
  PersonalCoachContext,
} from "@shared/personalCoachSchema";
import { useCallback, useEffect, useRef, useState } from "react";

import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { isDemoMode } from "@/app/utils/app-mode";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { requestPersonalCoachRecommendation } from "../api/personalCoachApi";
import { getPersonalCoachContextSignature } from "../context/buildPersonalCoachContext";
import { getDeterministicCoachFallback } from "../recommendation/getDeterministicCoachFallback";

const MAX_CACHE_ENTRIES = 20;
const recommendationCache = new Map<string, CoachRecommendation>();

export type PersonalCoachState =
  | { status: "idle"; recommendation: null }
  | { status: "loading"; recommendation: CoachRecommendation }
  | {
      status: "ready";
      recommendation: CoachRecommendation;
      source: "ai" | "deterministic";
    }
  | {
      status: "offline" | "rate_limited" | "error";
      recommendation: CoachRecommendation;
      errorCode?: string;
    };

interface PersonalCoachErrorLike {
  name?: unknown;
  status?: unknown;
  errorCode?: unknown;
  isNetworkError?: unknown;
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as PersonalCoachErrorLike).name === "AbortError",
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const errorCode = (error as PersonalCoachErrorLike).errorCode;
  return typeof errorCode === "string" ? errorCode : undefined;
}

function isRateLimited(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as PersonalCoachErrorLike;
  return value.status === 429 || value.errorCode === "COACH_RATE_LIMITED";
}

function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!error || typeof error !== "object") return false;
  const value = error as PersonalCoachErrorLike;
  return value.errorCode === "COACH_OFFLINE";
}

function readCachedRecommendation(signature: string): CoachRecommendation | undefined {
  const cached = recommendationCache.get(signature);
  if (!cached) return undefined;
  recommendationCache.delete(signature);
  recommendationCache.set(signature, cached);
  return cached;
}

function cacheRecommendation(signature: string, recommendation: CoachRecommendation): void {
  recommendationCache.delete(signature);
  recommendationCache.set(signature, recommendation);
  while (recommendationCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = recommendationCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    recommendationCache.delete(oldestKey);
  }
}

function getInitialState(context: PersonalCoachContext | null): PersonalCoachState {
  if (!context) return { status: "idle", recommendation: null };
  const fallback = getDeterministicCoachFallback(context);
  if (isDemoMode()) {
    return { status: "ready", recommendation: fallback, source: "deterministic" };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { status: "offline", recommendation: fallback, errorCode: "COACH_OFFLINE" };
  }
  if (!isApiBaseUrlConfigured()) {
    return {
      status: "error",
      recommendation: fallback,
      errorCode: "COACH_BACKEND_NOT_CONFIGURED",
    };
  }
  const cached = readCachedRecommendation(getPersonalCoachContextSignature(context));
  if (cached) return { status: "ready", recommendation: cached, source: "ai" };
  return { status: "loading", recommendation: fallback };
}

export function usePersonalCoach(context: PersonalCoachContext | null): {
  state: PersonalCoachState;
  retry: () => void;
  isRetrying: boolean;
} {
  const { isOffline } = useNetworkStatus();
  const signature = context ? getPersonalCoachContextSignature(context) : null;
  const contextRef = useRef(context);
  const signatureRef = useRef(signature);
  const offlineRef = useRef(isOffline);
  contextRef.current = context;
  signatureRef.current = signature;
  offlineRef.current = isOffline;

  const [state, setState] = useState<PersonalCoachState>(() => getInitialState(context));
  const [isRetrying, setIsRetrying] = useState(false);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const runRequest = useCallback(
    (
      activeContext: PersonalCoachContext,
      activeSignature: string,
      fallback: CoachRecommendation,
      retrying: boolean,
    ) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      inFlightRef.current = true;
      setIsRetrying(retrying);
      setState({ status: "loading", recommendation: fallback });

      void requestPersonalCoachRecommendation(activeContext, controller.signal)
        .then((recommendation) => {
          if (
            controller.signal.aborted ||
            requestIdRef.current !== requestId ||
            signatureRef.current !== activeSignature
          ) {
            return;
          }
          cacheRecommendation(activeSignature, recommendation);
          setState({ status: "ready", recommendation, source: "ai" });
        })
        .catch((error: unknown) => {
          if (
            controller.signal.aborted ||
            isAbortError(error) ||
            requestIdRef.current !== requestId ||
            signatureRef.current !== activeSignature
          ) {
            return;
          }

          const errorCode = getErrorCode(error);
          if (isRateLimited(error)) {
            setState({
              status: "rate_limited",
              recommendation: fallback,
              errorCode: errorCode ?? "COACH_RATE_LIMITED",
            });
          } else if (isOfflineError(error)) {
            setState({
              status: "offline",
              recommendation: fallback,
              errorCode: errorCode ?? "COACH_OFFLINE",
            });
          } else {
            setState({ status: "error", recommendation: fallback, errorCode });
          }
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          inFlightRef.current = false;
          controllerRef.current = null;
          setIsRetrying(false);
        });
    },
    [],
  );

  useEffect(() => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = false;
    setIsRetrying(false);

    const activeContext = contextRef.current;
    const activeSignature = signature;
    if (!activeContext || !activeSignature) {
      setState({ status: "idle", recommendation: null });
      return undefined;
    }

    const fallback = getDeterministicCoachFallback(activeContext);
    if (isDemoMode()) {
      setState({ status: "ready", recommendation: fallback, source: "deterministic" });
      return undefined;
    }
    if (isOffline) {
      setState({ status: "offline", recommendation: fallback, errorCode: "COACH_OFFLINE" });
      return undefined;
    }
    if (!isApiBaseUrlConfigured()) {
      setState({
        status: "error",
        recommendation: fallback,
        errorCode: "COACH_BACKEND_NOT_CONFIGURED",
      });
      return undefined;
    }

    const cached = readCachedRecommendation(activeSignature);
    if (cached) {
      setState({ status: "ready", recommendation: cached, source: "ai" });
      return undefined;
    }

    runRequest(activeContext, activeSignature, fallback, false);
    const activeController = controllerRef.current;
    return () => {
      if (!activeController || controllerRef.current !== activeController) return;
      activeController.abort();
      requestIdRef.current += 1;
      controllerRef.current = null;
      inFlightRef.current = false;
    };
  }, [isOffline, runRequest, signature]);

  const retry = useCallback(() => {
    if (inFlightRef.current) return;
    const activeContext = contextRef.current;
    const activeSignature = signatureRef.current;
    if (!activeContext || !activeSignature) return;

    const fallback = getDeterministicCoachFallback(activeContext);
    if (isDemoMode()) {
      setState({ status: "ready", recommendation: fallback, source: "deterministic" });
      return;
    }
    if (offlineRef.current || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      setState({ status: "offline", recommendation: fallback, errorCode: "COACH_OFFLINE" });
      return;
    }
    if (!isApiBaseUrlConfigured()) {
      setState({
        status: "error",
        recommendation: fallback,
        errorCode: "COACH_BACKEND_NOT_CONFIGURED",
      });
      return;
    }

    runRequest(activeContext, activeSignature, fallback, true);
  }, [runRequest]);

  return { state, retry, isRetrying };
}
