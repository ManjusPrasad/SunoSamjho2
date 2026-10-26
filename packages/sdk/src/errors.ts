export class SunoSamjhoError extends Error {
  public code: string;
  public statusCode?: number;
  public requestId?: string;

  constructor(message: string, code = 'SDK_ERROR', statusCode?: number, requestId?: string) {
    super(message);
    this.name = 'SunoSamjhoError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

export class AuthenticationError extends SunoSamjhoError {
  constructor(message = 'Invalid API key or authentication failed', requestId?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, requestId);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends SunoSamjhoError {
  public retryAfterSeconds?: number;

  constructor(message = 'Rate limit exceeded', retryAfterSeconds?: number, requestId?: string) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, requestId);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class RoomNotFoundError extends SunoSamjhoError {
  constructor(message = 'Conversation room not found or expired', requestId?: string) {
    super(message, 'ROOM_NOT_FOUND', 404, requestId);
    this.name = 'RoomNotFoundError';
  }
}
