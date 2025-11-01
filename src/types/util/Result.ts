import { Unsafe } from "@/types";

/**
 * A successful result containing a value of type `T`.
 *
 * @template T The success value type.
 * @template E The error type, must extend `Error`.
 *
 * @example
 * ```ts
 * const result = Result.ok(123);
 * if (result.isOk) {
 *   console.log(result.value); // 123
 * }
 * ```
 */
class Ok<T, E extends Error> {
  readonly isOk = true;
  readonly isErr = false;

  constructor(public readonly value: T) {}

  /**
   * Returns the value if `Ok`, otherwise throws the contained error
   * @throws {E} The contained error
   *
   * @example
   * ```ts
   * const value = Result.err(new Error("fail")).unwrapOrThrow();
   * ```
   */
  unwrapOrThrow(): T {
    return this.value;
  }

  /**
   * Returns the value if `Ok`, otherwise returns the provided default.
   *
   * @example
   * ```ts
   * const value = Result.err(new Error("fail")).unwrapOr(10); // 10
   * ```
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  /**
   * Returns union of value if `Ok` or error otherwise. Very useful if you don't
   * want to extract inner members out of the Result due to aesthetic reasons.
   *
   * NOTE: Error type should be a `class` and NOT `interface` or `type`.
   *
   * ⚠️ UNSAFE: This requires using `instanceof` which IMO is lacking in type safety.
   * For example, if you get a `Unsafe<T|E>`, you can do `instanceof U` without issues
   * even though the returned value is either `T` or `E` and not `U`. Of course,
   * TS doesn't let you access the `T` unless `E` is handled.
   *
   * @example
   * ```ts
   * fnThatReturnsResult(): Result<MyValue, MyError>;
   *
   * const { UNSAFE: result }: Unsafe<MyValue | MyError> = fnThatReturnsResult().unwrap();
   *
   * if (result instanceof MyError) {
   *   // result is definitely of MyError type
   * } else  {
   *   // result is definitely of MyValue type
   * }
   * ```
   */
  unwrap(): Unsafe<T | E> {
    return { UNSAFE: this.value };
  }

  /**
   * Converts the result to a Promise. Resolves if `Ok`, rejects if `Err`.
   *
   * @example
   * ```ts
   * const result = Result.ok("data");
   * await result.toPromise(); // resolves with "data"
   *
   * const errResult = Result.err(new Error("fail"));
   * await errResult.toPromise(); // throws "fail"
   * ```
   */
  async toPromise(): Promise<T> {
    return Promise.resolve(this.value);
  }
}

/**
 * A failed result containing an error of type `E`.
 *
 * @template T The success value type.
 * @template E The error type, must extend `Error`.
 *
 * @example
 * ```ts
 * const result = Result.err(new Error("Something went wrong"));
 * if (result.isErr) {
 *   console.error(result.error.message); // "Something went wrong"
 * }
 * ```
 */
class Err<T, E extends Error> {
  readonly isOk = false;
  readonly isErr = true;

  constructor(public readonly error: E) {}

  /**
   * Returns the value if `Ok`, otherwise throws the contained error
   * @throws {E} The contained error
   *
   * @example
   * ```ts
   * const value = Result.err(new Error("fail")).unwrapOrThrow();
   * ```
   */
  unwrapOrThrow(): T {
    throw this.error;
  }

  /**
   * Returns the value if `Ok`, otherwise returns the provided default.
   *
   * @example
   * ```ts
   * const value = Result.err(new Error("fail")).unwrapOr(10); // 10
   * ```
   */
  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Returns union of value if `Ok` or error otherwise. Very useful if you don't
   * want to extract inner members out of the Result due to aesthetic reasons.
   *
   * NOTE: Error type should be a `class` and NOT `interface` or `type`.
   *
   * ⚠️ UNSAFE: This requires using `instanceof` which IMO is lacking in type safety.
   * For example, if you get a `Unsafe<T|E>`, you can do `instanceof U` without issues
   * even though the returned value is either `T` or `E` and not `U`. Of course,
   * TS doesn't let you access the `T` unless `E` is handled.
   *
   * @example
   * ```ts
   * fnThatReturnsResult(): Result<MyValue, MyError>;
   *
   * const { UNSAFE: result }: Unsafe<MyValue | MyError> = fnThatReturnsResult().unwrap();
   *
   * if (result instanceof MyError) {
   *   // result is definitely of MyError type
   * } else  {
   *   // result is definitely of MyValue type
   * }
   * ```
   */
  unwrap(): Unsafe<T | E> {
    return { UNSAFE: this.error };
  }

  /**
   * Converts the result to a Promise. Resolves if `Ok`, rejects if `Err`.
   *
   * @example
   * ```ts
   * const result = Result.ok("data");
   * await result.toPromise(); // resolves with "data"
   *
   * const errResult = Result.err(new Error("fail"));
   * await errResult.toPromise(); // throws "fail"
   * ```
   */
  async toPromise(): Promise<T> {
    return Promise.reject(this.error);
  }
}

/**
 * A result type that represents either a success (`Ok`) or a failure (`Err`).
 *
 * @template T The success value type.
 * @template E The error type, must extend `Error`.
 */
export type Result<T, E extends Error> = Ok<T, E> | Err<T, E>;

export const Result = {
  /**
   * Creates a successful result.
   *
   * @example
   * ```ts
   * const result = Result.ok(123);
   * if (result.isOk) {
   *   console.log(result.value); // 123
   * }
   * ```
   */
  ok<T, E extends Error = never>(value: T): Result<T, E> {
    return new Ok<T, E>(value);
  },

  /**
   * Creates a failed result.
   *
   * @example
   * ```ts
   * const result = Result.err(new Error("Something went wrong"));
   * if (result.isErr) {
   *   console.error(result.error.message); // "Something went wrong"
   * }
   * ```
   */
  err<T = never, E extends Error = Error>(error: E): Result<T, E> {
    return new Err<T, E>(error);
  },
};
