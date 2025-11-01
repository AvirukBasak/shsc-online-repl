export type PureNullable<T> = T | null;
export type PureUndefinable<T> = T | undefined;
export type Nullable<T> = T | null | undefined;
export interface Unsafe<T> { UNSAFE: T }
export const UNKNOWN_STR = "(unknown)" as const;
