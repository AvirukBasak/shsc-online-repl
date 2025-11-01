import { NextApiRequest, NextApiResponse } from "next";
import { respond } from "@/utils/respond";
import { WithMiddleware } from "@/middlewares/WithMiddleware";

/**
 * ```
 * request = "GET /api"
 *
 * response = {
 *   message: "Hello World!"
 * }
 * ```
 */
export default WithMiddleware(async function GET(_: NextApiRequest, res: NextApiResponse) {
  await Promise.resolve();
  return respond(res, { status: 200, message: "Hello World!" });
});
