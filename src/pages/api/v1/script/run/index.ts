import z from "zod";
import { WithMiddleware } from "@/middlewares/WithMiddleware";
import { CommonZodSchemas } from "@/parsers/CommonZodSchemas";
import { RequestValidationParser } from "@/parsers/RequestValidationParser";
import { ExecResult, Runner } from "@/services/Runner";
import { HttpMethodTypes, Nullable } from "@/types";
import { CustomApiError } from "@/types/errors";
import { getRawBody } from "@/utils/getRawBody";
import { respond } from "@/utils/respond";
import { createHash } from "crypto";
import { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { bodyParser: false } };

export default WithMiddleware(
  /**
   * ### POST `/api/v1/script/run?text=[bool:false]`
   *
   * Used to POST a script and run it.
   *
   * #### Request
   *
   * With `Content-Type: application/json`:
   *
   * ```ts
   * {
   *     code: string,
   *     stdin?: string,
   * }
   * ```
   *
   * With `Content-Type: text/plain`:
   * 
   * ```
   * <string>
   * ```
   *
   * #### Response
   * ```ts
   * {
   *     code?: string | number,
   *     stdout?: string,
   *     stderr?: string,
   * }
   * ```
   */
  async function POST(req: NextApiRequest, res: NextApiResponse) {
    const { text = false } = RequestValidationParser.parse({
      req,
      method: HttpMethodTypes.POST,
      params: z.object({
        text: CommonZodSchemas.QueryParam.OPTIONAL_BOOL,
      }),
    });

    // plain text body
    if (req.headers["content-type"] === "text/plain") {
      const rawBody = await getRawBody(req);
      const code = rawBody.toString("utf-8");
      if (typeof code !== "string") {
        throw CustomApiError.create(400, "Invalid `code`");
      }

      const uid = createHash("sha256").update(code).digest("hex");

      const runner = Runner.create(uid);
      try {
        const result = runner.run(code);

        if (!text) return respond(res, { status: 200, json: result });
        else return respond(res, { status: 200, text: execResultToText(result) });
      } finally {
        runner.destroy();
      }
    }

    // json body
    else if (req.headers["content-type"] === "application/json") {
      let body: Nullable<Record<string, unknown>> = null;
      try {
        const rawBody = await getRawBody(req);
        const strBody = rawBody.toString("utf-8");
        body = JSON.parse(strBody) as Record<string, unknown>;
      } catch (error) {
        throw CustomApiError.create(400, "Invalid request", error);
      }

      const code = body["code"];
      if (typeof code !== "string") {
        throw CustomApiError.create(400, "Invalid `code`");
      }

      const stdin = body["stdin"];
      if (stdin != null && typeof stdin !== "string") {
        throw CustomApiError.create(400, "Invalid `stdin`");
      }

      const uid = createHash("sha256").update(code).digest("hex");

      const runner = Runner.create(uid);
      try {
        const result = runner.run(code, stdin);

        if (!text) return respond(res, { status: 200, json: result });
        else return respond(res, { status: 200, text: execResultToText(result) });
      } finally {
        runner.destroy();
      }
    }

    // invalid body
    else {
      throw CustomApiError.create(400, "Invalid request");
    }
  }
);

function execResultToText(result: ExecResult): string {
  const sectionGap = "\n" + "-".repeat(50) + "\n";
  return (
    `CODE: ${result.code}` +
    sectionGap +
    "STDOUT:" +
    sectionGap +
    (result.stdout ?? "") +
    sectionGap +
    "STDERR:" +
    sectionGap +
    (result.stderr ?? "") +
    sectionGap
  );
}
