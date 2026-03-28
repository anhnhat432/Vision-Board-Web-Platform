export interface AppError {
  message: string;
  status?: number;
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
