// Result type - Either monad pattern
export type Result<T, E = Error> = 
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'err'; readonly error: E };

// Constructor functions
export const ok = <T>(value: T): Result<T, never> => ({ kind: 'ok', value });
export const err = <E>(error: E): Result<never, E> => ({ kind: 'err', error });

// Type guards
export const isOk = <T, E>(result: Result<T, E>): result is { kind: 'ok'; value: T } => 
  result.kind === 'ok';
export const isErr = <T, E>(result: Result<T, E>): result is { kind: 'err'; error: E } => 
  result.kind === 'err';

// Transformation functions
export const map = <T, U, E>(fn: (x: T) => U) => 
  (result: Result<T, E>): Result<U, E> =>
    result.kind === 'ok' ? ok(fn(result.value)) : result;

export const flatMap = <T, U, E>(fn: (x: T) => Result<U, E>) => 
  (result: Result<T, E>): Result<U, E> =>
    result.kind === 'ok' ? fn(result.value) : result;

export const mapErr = <T, E, F>(fn: (e: E) => F) => 
  (result: Result<T, E>): Result<T, F> =>
    result.kind === 'err' ? err(fn(result.error)) : result;

// Extraction functions
export const unwrapOr = <T, E>(defaultValue: T) => 
  (result: Result<T, E>): T =>
    result.kind === 'ok' ? result.value : defaultValue;

export const unwrapOrElse = <T, E>(fn: (e: E) => T) => 
  (result: Result<T, E>): T =>
    result.kind === 'ok' ? result.value : fn(result.error);

// Async variants
export const flatMapAsync = <T, U, E>(fn: (x: T) => Promise<Result<U, E>>) => 
  async (result: Result<T, E>): Promise<Result<U, E>> =>
    result.kind === 'ok' ? fn(result.value) : result;

export const mapAsync = <T, U, E>(fn: (x: T) => Promise<U>) => 
  async (result: Result<T, E>): Promise<Result<U, E>> =>
    result.kind === 'ok' ? ok(await fn(result.value)) : result;

// Try/catch wrapper for async operations
export const tryAsync = async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
  try {
    return ok(await fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

// Try/catch wrapper for sync operations
export const trySync = <T>(fn: () => T): Result<T, Error> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
