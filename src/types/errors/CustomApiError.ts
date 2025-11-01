import { MultipleErrors } from "@/types/errors";

export class CustomApiError extends Error {
  status: number;
  override cause: unknown;

  private constructor(status: number, message: string, cause?: unknown) {
    super(message);

    this.name = `CustomApiError [${status}]`;
    this.status = status;

    if (Array.isArray(cause)) {
      this.cause = new MultipleErrors(cause);
    } else if (cause instanceof Error || typeof cause === "string") {
      this.cause = cause;
    } else {
      this.cause = JSON.stringify(cause, null, 2);
    }
  }

  static create(status: number, message: string, cause?: unknown): CustomApiError {
    return new CustomApiError(status, message, cause);
  }
}
