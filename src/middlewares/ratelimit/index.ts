import { LRUCache } from "lru-cache";
import { getPossibleClientIp } from "@/utils/getClientIp";
import { NextApiRequest, NextApiResponse } from "next";
import { Nullable } from "@/types";

// Initialize LRU cache instead of Redis
const rateCache = new LRUCache({
  // Max size to store in cache
  maxSize: 50 * 1024 * 1024, // 50 MB
  // Size calculation function to determine size of each entry
  sizeCalculation: (value) => JSON.stringify(value).length,
  // TTL for each entry in milliseconds (60 seconds/1 minute)
  ttl: 60 * 1000,
});

/**
 * Rate limiter function for Next.js API routes that incorporates URL path
 * @param frequency Maximum number of requests allowed in the time window (e.g., 10 requests per minute)
 * @param uid Optional user ID for tracking requests
 * @param path Optional path used in API url for tracking
 * @param req Next.js API request object
 * @param res Next.js API response object
 * @returns Promise<boolean> - true if request is allowed, false if rate limited
 */
export async function rateLimiter(
  frequency: number,
  uid: Nullable<string>,
  path: Nullable<string>,
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> {
  // Use uid if provided, otherwise use IP address as identifier
  const clientIp = getPossibleClientIp(req);
  // Extract the URL path to include in the rate limiting key
  let queryPath = "/";
  if (req.query["path"] instanceof Array) {
    if (req.query["path"].length > 0) {
      queryPath = req.query["path"].join(",");
    } else {
      queryPath = "/";
    }
  } else if (typeof req.query["path"] === "string") {
    if (req.query["path"].length > 0) {
      queryPath = req.query["path"];
    } else {
      queryPath = "/";
    }
  } else {
    queryPath = "/";
  }
  const pathId = path ?? req.url ?? queryPath;
  // Create a unique identifier for rate limiting that includes both user/IP and path
  const identifier = uid ?? String(clientIp);
  // Create a key with a prefix and path
  const key = `ratelimit:${identifier}:${pathId}`;
  // Get current count for this identifier and path combination
  const currentCount = Number(rateCache.get(key) ?? 0);
  // If count exists and exceeds frequency, reject the request
  if (currentCount !== 0 && currentCount >= frequency) {
    res.status(429).json({
      error: "Too many requests, please try again later.",
    });
    console.log(`[W] [RateLimiter] blocked ${frequency} ${identifier} ${path}`);
    return Promise.resolve(false);
  }
  // Increment the counter (or create if doesn't exist)
  rateCache.set(key, currentCount + 1);
  // Request is allowed
  return Promise.resolve(true);
}

export const RateLimits = {
  RunScript: {
    POST: (uid: Nullable<string>, req: NextApiRequest, res: NextApiResponse): Promise<boolean> =>
      rateLimiter(60, uid, "RunScript.POST", req, res),
  }
};
