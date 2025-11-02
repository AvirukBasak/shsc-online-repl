import { NextApiRequest, NextApiResponse } from "next";
import { ApiHandlerFunction } from "@/middlewares/WithMiddleware";
import { CustomApiError } from "@/types/errors";

const TIMEOUT = 15_000;

export function errOnTimeout(handlerFn: ApiHandlerFunction): ApiHandlerFunction {
  return (req: NextApiRequest, res: NextApiResponse) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(CustomApiError.create(500, `Timed out after ${TIMEOUT}ms`)), TIMEOUT);
      void handlerFn(req, res)
        .then((r: void) => resolve(r))
        .then(() => clearTimeout(timer))
        .catch((e: Error) => reject(e));
    });
}
