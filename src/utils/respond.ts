import { NextApiResponse } from "next";
import { ADataTransferObj } from "@/types/abstract";
import { NetworkType } from "@/types/util";
import { HeaderTypes } from "@/types";

export function respond(res: NextApiResponse, result: { status: number; text: string }): void;
export function respond(res: NextApiResponse, result: { status: number; message: string }): void;
export function respond(res: NextApiResponse, result: { status: number; error: string }): void;
export function respond(res: NextApiResponse, result: { status: number; json: NetworkType }): void;

export function respond<T extends ADataTransferObj>(res: NextApiResponse, result: { status: number; dto: T }): void;

// Implementation
export function respond<T extends ADataTransferObj>(
  res: NextApiResponse,
  result: {
    status: number;
    message?: string;
    text?: string;
    error?: string;
    json?: NetworkType;
    dto?: T | T[];
  }
): void {
  if (result.dto != null) {
    // Use the static toJson method from the DTO class
    if (Array.isArray(result.dto)) {
      const jsonData = result.dto.map((dto) => dto.toJSON());
      res.status(result.status).json(jsonData);
    } else {
      const jsonData = result.dto.toJSON();
      res.status(result.status).json(jsonData);
    }
  } else if (result.json != null) {
    res.status(result.status).json(result.json);
  } else if (result.text != null) {
    res.writeHead(result.status, { [HeaderTypes.CONTENT_TYPE]: "text/plain" }).end(result.text);
  } else {
    res.status(result.status).json({
      status: result.status,
      message: result.message ?? result.error ?? "Unknown error occurred",
    });
  }
  res.end();
}
