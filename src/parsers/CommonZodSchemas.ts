import { LogType } from "@/types";
import z from "zod";

export const CommonZodSchemas = {
  Basic: {
    STRING: z.string().nonempty(),
    STRING_NONEMPTY: z.string().nonempty(),
    STRING_NONEMPTY_OPTIONAL: z.string().nonempty().optional(),
    BOOL: z.boolean(),
    BOOL_OPTIONAL_DEFAULT: z.boolean().optional().default(false),
    UID: z.string().nonempty(),
    BASE_64: z.base64().nonempty(),
    INT_POSITIVE: z.int().positive(),
    INT_NONNEG: z.int().min(0),
    NUM_POSITIVE: z.number().positive(),
    NUM_NONNEG: z.number().min(0),
  },

  Enum: {
    LOGTYPE: z.enum(LogType),
  },

  QueryParam: {
    COMMASEP: z
      .string()
      .optional()
      .transform((val) => (val != null ? (val.split(",").filter(Boolean)) : void 0))
      .optional(),

    OPTIONAL_BOOL: z
      .string()
      .optional()
      .transform((val) => val === "true" || val === "1")
      .optional(),

    NUM: z
      .string()
      .optional()
      .transform((val) => (val != null ? parseFloat(val) : void 0))
      .optional(),
    INT: z
      .string()
      .optional()
      .transform((val) => (val != null ? parseInt(val, 10) : void 0))
      .optional(),

    CHUNK_NO: z
      .string()
      .optional()
      .transform((val) => (val != null ? parseInt(val, 10) : void 0))
      .optional()
      .default(1),
  },
};
