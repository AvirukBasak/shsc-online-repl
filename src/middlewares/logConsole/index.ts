import { NextApiRequest, NextApiResponse } from "next";
import { getPossibleClientIp } from "@/utils/getClientIp";
import { UNKNOWN_STR } from "@/types";

export function consoleLog(req: NextApiRequest, res: NextApiResponse): void {
  const method = (req.method ?? UNKNOWN_STR).toUpperCase();
  const url = req.url ?? UNKNOWN_STR;
  const statusCode = res.statusCode;
  const clientIp = getPossibleClientIp(req);

  function getFormattedDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  function colorStatusCode(statusCode: number) {
    if (statusCode >= 200 && statusCode < 300) {
      return `\x1b[32m${statusCode}\x1b[0m`; // Green
    } else if (statusCode >= 300 && statusCode < 400) {
      return `\x1b[34m${statusCode}\x1b[0m`; // Blue
    } else if (statusCode >= 400 && statusCode < 500) {
      return `\x1b[33m${statusCode}\x1b[0m`; // Yellow
    } else if (statusCode >= 500 && statusCode < 600) {
      return `\x1b[31m${statusCode}\x1b[0m`; // Red
    } else {
      return statusCode;
    }
  }

  const logType = statusCode >= 500 ? "E" : "I";

  console.log(`[${logType}] [${getFormattedDateTime()}] ${clientIp} ${method} ${url} ${colorStatusCode(statusCode)}`);
}
