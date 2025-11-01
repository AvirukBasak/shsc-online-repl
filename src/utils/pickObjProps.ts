/**
 * This utility function picks specific properties from an object.
 * It is useful for creating a new object with only the desired properties.
 *
 * @param obj - The source object from which to pick properties.
 * @param keys - An array of keys to pick from the source object.
 * @returns A new object containing only the specified keys and their values.
 *
 * @example
 * const user = { id: 1, name: "Alice", age: 30 };
 * const pickedUser = pickObjProps(user, ["id", "name"]);
 * // pickedUser will be { id: 1, name: "Alice" }
 */
// Usage example:
// ```typescript
// const user = { id: 1, name: "Alice", age: 30 };
// const pickedUser = pickObjProps(user, ["id", "name"]);
// // pickedUser will be { id: 1, name: "Alice" }
// ```
export function pickObjProps<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const picked: Partial<T> = {};
  for (const key of keys) {
    if (key in obj && obj[key] != null) {
      picked[key] = obj[key];
    }
  }
  return picked as Pick<T, K>;
}
