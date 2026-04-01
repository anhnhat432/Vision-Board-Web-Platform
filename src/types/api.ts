export interface AppError {
  message: string;
  status?: number;
}

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  onboardingCompletedAt: string | null;
  avatarUrl: string | null;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  message?: string;
  details?: unknown;
}
