export class MultipleErrors extends Error {
  errors: unknown[];

  constructor(errors: unknown[]) {
    super();
    this.errors = errors;
    this.message = this.getMessage().message;
    this.name = `MultipleErrors (${errors.length} errors)`;
  }

  flattenErrors(): unknown[] {
    const result: unknown[] = [];

    function helper(e: unknown): void {
      if (e == null) return;
      if (Array.isArray(e)) {
        // If it's an array, flatten each element
        for (const inner of e) {
          helper(inner);
        }
      } else if (e instanceof MultipleErrors) {
        // If it's a MultipleErrors, flatten its internal errors
        for (const inner of e.errors) {
          helper(inner);
        }
      } else {
        // Base case: push a single error or value
        result.push(e);
      }
    }

    helper(this.errors);
    return result;
  }

  getSummary(): string {
    const flattened = this.flattenErrors();
    if (flattened.length === 0) {
      return "MultipleErrors: (but no errors found)";
    }
    // Get first error’s message
    let firstMessage = "Unknown error";
    const first = flattened[0];
    if (first instanceof Error) {
      if (first.message !== "") firstMessage = first.message;
      else if (first.name !== "") firstMessage = first.name;
      else firstMessage = "Unknown error";
    } else if (typeof first === "string") {
      firstMessage = first;
    } else if (first != null) {
      try {
        firstMessage = JSON.stringify(first);
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        firstMessage = String(first);
      }
    }
    const remaining = flattened.length - 1;
    const message =
      remaining > 0 ? `MultipleErrors: ${firstMessage} (and ${remaining} more)` : `MultipleErrors: ${firstMessage}`;
    return message;
  }

  getMessage(): { message: string; count: number } {
    const errorMessages: string[] = [];
    this.flattenErrors().forEach((err, index) => {
      let name = "UnknownError";
      let message = "";
      if (err == null || err instanceof Error) {
        if (err?.name != null && err.name.length > 0) name = err.name;
        if (err?.message != null && err.message.length > 0) message = err.message;
      } else if (typeof err === "string") {
        message = err;
      } else {
        message = JSON.stringify(err, null, 2);
      }

      errorMessages.push(`MultipleErrors[${index + 1}]: ${name}: ${message}`);
    });
    return { message: "\n\n" + errorMessages.join("\n"), count: errorMessages.length };
  }

  public override toString(): string {
    return this.getMessage().message;
  }
}
