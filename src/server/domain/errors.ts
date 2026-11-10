/**
 * The domain's one error type (ADR-0001: pure TypeScript, no framework).
 *
 * Boundary adapters map a `code` to an HTTP answer or a UI state; nothing in
 * `src/server/domain` ever throws a bare `Error` with a free-text message, so
 * callers can branch on the code instead of on string matching.
 */
export type DomainErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_AMOUNT'
  | 'INVALID_CENTS'
  | 'BALANCE_INVARIANT';

export class DomainError extends Error {
  public readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'DomainError';
    this.code = code;
  }
}

export const domainError = (code: DomainErrorCode, message: string): DomainError =>
  new DomainError(code, message);

export const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;
