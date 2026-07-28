import type { MultiCaptureError, MultiCaptureErrorCode } from '../types';

export class AssetProcessingFailure extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super(getErrorMessage(cause));
    this.name = 'AssetProcessingFailure';
    this.cause = cause;
  }
}

export function createMultiCaptureError(
  code: MultiCaptureErrorCode,
  message: string,
  cause?: unknown
): MultiCaptureError {
  return { code, message, cause };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}
