import { createHash } from "crypto";
import { Readable } from "stream";

/**
 * Create SHA-256 checksum of a file in Firebase Storage
 * @throws {Error} on hashing failure
 */
export async function createSha256Sum(data: Buffer | Readable): Promise<string> {
  const hash = createHash("sha256");
  const stream = data instanceof Buffer ? Readable.from(data) : (data as Readable);
  return new Promise((resolve, reject) =>
    stream
      .on("data", (chunk: Buffer) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", (err) => reject(err))
  );
}
