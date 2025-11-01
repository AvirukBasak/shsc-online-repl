export type Range<N extends number, Acc extends number[] = []> = Acc["length"] extends N
  ? Acc[number]
  : Range<N, [...Acc, Acc["length"]]>;

export type Byte = Range<256>;

export function toHexByte(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new RangeError("Value must be an integer between 0 and 255");
  }
  return n.toString(16).toUpperCase().padStart(2, "0");
}
