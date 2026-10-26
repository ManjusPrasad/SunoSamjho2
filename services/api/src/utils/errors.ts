export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: any;
  };
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const ERROR_MESSAGES = {
  MICROPHONE_DENIED: 'Please allow microphone access to start speaking.',
  GNANI_UNAVAILABLE: 'Voice processing is temporarily unavailable.',
  NETWORK_ERROR: 'Connection lost. Reconnecting...',
  UNSUPPORTED_LANGUAGE: 'This language is not currently supported.',
  INVALID_API_KEY: 'Your API key is invalid or has been revoked.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment before trying again.',
  ROOM_NOT_FOUND: 'The conversation room does not exist or has expired.',
  ROOM_FULL: 'This conversation room already has the maximum number of participants.',
  INTERNAL_ERROR: 'An unexpected internal error occurred. Please try again.',
};
