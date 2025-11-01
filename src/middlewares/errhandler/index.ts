import { NextApiRequest, NextApiResponse } from "next";
import { respond } from "@/utils/respond";
import { CustomApiError } from "@/types/errors";
import { ApiHandlerFunction } from "@/middlewares/WithMiddleware";
import { consoleLog } from "@/middlewares/logConsole";
import { Nullable } from "@/types";

function handleErr(e: Nullable<Error>, res: NextApiResponse) {
  if (e == null) {
    console.error("[E] [CatchAll] Error object is null");
    return respond(res, { status: 500, error: "Internal Server Error" });
  }
  if (e instanceof CustomApiError) {
    respond(res, { status: e.status, error: e.message });
    console.error(e);
  } else {
    // Either not index related error or is not firebase error
    respond(res, { status: 500, error: "Internal Server Error" });
    console.error(e);
  }
}

export function catchAll(handlerFn: ApiHandlerFunction): ApiHandlerFunction {
  return (req: NextApiRequest, res: NextApiResponse) =>
    new Promise<void>((resolve, _) => {
      try {
        const prom = handlerFn(req, res);
        if (prom instanceof Promise)
          prom
            .then(() => consoleLog(req, res))
            .then(() => resolve())
            .catch((e: Error) => {
              handleErr(e, res);
              consoleLog(req, res);
            });
      } catch (e) {
        const error = e instanceof Error ? e : CustomApiError.create(500, "Internal Server Error", e);
        handleErr(error, res);
        consoleLog(req, res);
      }
    });
}
