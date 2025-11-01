import { ValidationError } from "class-validator";

export class DtoValidationError extends Error {
  constructor(error: string | ValidationError[]) {
    super();
    this.name = "DtoValidationError";
    if (typeof error === "string") {
      this.message = error;
    } else {
      this.message = DtoValidationError.formatMessage(error);
    }
  }

  private static formatMessage(errors: ValidationError[]): string {
    const messages: string[] = [];

    for (const error of errors) {
      const property = error.property;

      if (error.constraints == null) {
        messages.push(`    Invalid '${property}'`);
        continue;
      }

      for (const k of Object.keys(error.constraints)) {
        const kMsg = error.constraints[k];
        if (kMsg == null || kMsg.length === 0) {
          messages.push(`    Invalid '${property}'. Failed constraint: ${k}`);
        } else {
          messages.push(`    Invalid '${property}'. Failed constraint: ${k} (${error.constraints[k]})`);
        }
      }
    }

    return "\n" + messages.join("\n") + "\n";
  }
}
