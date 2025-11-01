import "dotenv/config";
import "reflect-metadata";
import { getHostLocalIPv4 } from "@/utils/getHostLocalIPv4";

if (process.env["ENVIRONMENT_TYPE"] == null) throw new Error(".env ENVIRONMENT_TYPE undefined");
if (process.env["API_SERVER_ORIGIN"] == null) throw new Error(".env API_SERVER_ORIGIN undefined");
if (process.env["ALLOWED_ORIGINS"] == null) throw new Error(".env ALLOWED_ORIGINS undefined");
if (process.env["ALLOW_ANY_ORIGIN"] == null) throw new Error(".env ALLOW_ANY_ORIGIN undefined");
if (process.env["ALLOW_MISSING_ORIGIN"] == null) throw new Error(".env ALLOW_MISSING_ORIGIN undefined");
if (process.env["REDIS_URL"] == null) throw Error(".env REDIS_URL undefined");

// vercel provide env info
export const VERCEL_ENV = process.env["VERCEL_ENV"] ?? "development";
export const VERCEL_URL = process.env["VERCEL_URL"];

const hostLocalIPv4 = getHostLocalIPv4();

export const API_SERVER_ORIGIN =
  VERCEL_ENV === "production"
    ? process.env["API_SERVER_ORIGIN"]
    : VERCEL_ENV === "preview" && VERCEL_URL != null
    ? `https://${VERCEL_URL}`
    : hostLocalIPv4 != null
    ? `http://${hostLocalIPv4}:3001`
    : process.env["API_SERVER_ORIGIN"];

export const ALLOWED_ORIGINS = JSON.parse(
  process.env["ALLOWED_ORIGINS"].length == 0 ? "[]" : process.env["ALLOWED_ORIGINS"]
) as string[];

ALLOWED_ORIGINS.push(API_SERVER_ORIGIN);

export const ALLOW_ANY_ORIGIN = process.env["ALLOW_ANY_ORIGIN"] === "true";
export const ALLOW_MISSING_ORIGIN = process.env["ALLOW_MISSING_ORIGIN"] === "true";

// custom env info
const ValidCustomEnvTypes = ["dev", "devnoemu"];

export const IS_DEV = ValidCustomEnvTypes.includes(process.env["ENVIRONMENT_TYPE"]) || VERCEL_ENV === "development";
export const IS_PREVIEW = VERCEL_ENV === "preview";
export const IS_DEV_OR_PREVIEW = IS_DEV || IS_PREVIEW;

export const ALLOW_DEVMODE_DEFAULT_USER = IS_DEV && process.env["ALLOW_DEVMODE_DEFAULT_USER"] === "true";
export const DEVMODE_DEFAULT_USER_ID = process.env["DEVMODE_DEFAULT_USER_ID"] ?? "DevmodeDefaultUser";

export const RUN_ON_EMULATOR =
  /localhost|127\.0\.0\.1|192\.168/i.test(API_SERVER_ORIGIN) && "devnoemu" !== process.env["ENVIRONMENT_TYPE"];

export const REDIS_URL = process.env["REDIS_URL"];

export class ApiPaths {
}
