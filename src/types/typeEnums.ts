export enum LogType {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export enum HeaderTypes {
  CONTENT_TYPE = "content-type",
  CONTENT_LENGTH = "content-length",
  X_FIREBASE_TOKEN = "x-firebase-token",
  X_CONTENT_ENCODING = "x-content-encoding",
  X_DECODED_CONTENT_TYPE = "x-decoded-content-type",
  ACCESS_CONTROL_ALLOW_ORIGIN = "access-control-allow-origin",
  ACCESS_CONTROL_ALLOW_METHODS = "access-control-allow-methods",
  ACCESS_CONTROL_ALLOW_HEADERS = "access-control-allow-headers",
  ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers",
  ACCESS_CONTROL_ALLOW_CREDENTIALS = "access-control-allow-credentials",
}

export enum HttpMethodTypes {
  POST = "POST",
  GET = "GET",
  PATCH = "PATCH",
  DELETE = "DELETE",
}
