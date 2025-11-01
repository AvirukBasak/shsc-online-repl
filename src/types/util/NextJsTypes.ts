import { IncomingMessage } from "http";

export type NextJsReqQuery = Partial<Record<string, string | string[]>>;
export type NextJsReqBody = object;
export type NextJsApiReq = IncomingMessage & { query: NextJsReqQuery; body: NextJsReqBody };