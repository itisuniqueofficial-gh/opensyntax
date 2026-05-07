export class UserFacingError extends Error {
  constructor(message: string, readonly code = 'USER_ERROR') {
    super(message);
    this.name = 'UserFacingError';
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
