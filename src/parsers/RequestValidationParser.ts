import { z, ZodError } from "zod";
import { NextApiRequest } from "next";
import { CustomApiError } from "@/types/errors";
import { HttpMethodTypes } from "@/types";

export class RequestValidationParser {
  /**
   * Parses and validates query parameters from a Next.js API request
   * @param req - The Next.js API request object
   * @param schema - Zod schema to validate against
   * @returns Parsed and validated query parameters
   * @throws CustomApiError if validation fails
   */
  static parse<T extends z.ZodSchema>({
    req,
    method,
    params,
  }: {
    req: NextApiRequest;
    method: HttpMethodTypes | HttpMethodTypes[];
    params?: T;
  }): z.infer<T> {
    // `req.method as HttpMethodTypes` is "unsafe" coz HttpMethodTypes is infact a subset of req.method (string | undefined)
    if (req.method != null) {
      if (Array.isArray(method) && !method.includes(req.method as HttpMethodTypes)) {
        throw CustomApiError.create(405, "Method Not Allowed");
      } else if (!Array.isArray(method) && method !== (req.method as HttpMethodTypes)) {
        throw CustomApiError.create(405, "Method Not Allowed");
      }
    } else {
      throw CustomApiError.create(400, "Unknown method provided");
    }

    try {
      if (params == null) {
        return z.object({}).parse(req.query) as z.infer<T>;
      }
      // Parse the query parameters with the provided schema
      return params.parse(req.query) as z.infer<T>;
    } catch (e) {
      if (e instanceof ZodError) {
        throw CustomApiError.create(400, "Bad Request", e);
      }

      // Re-throw unexpected errors
      throw e;
    }
  }
}
