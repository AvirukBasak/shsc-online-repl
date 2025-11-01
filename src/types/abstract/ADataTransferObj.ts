import { NetworkType, Result } from "@/types/util";
import { DtoValidationError } from "@/types/errors";
import { instanceToPlain } from "class-transformer";
import { validateSync } from "class-validator";

interface ISerializable {
  toJSON(): NetworkType;
}

export abstract class ADataTransferObj implements ISerializable {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected constructor(..._: unknown[]) {}

  toJSON(): NetworkType {
    return instanceToPlain(this);
  }

  protected static _fromJson<T extends ADataTransferObj>(dto: T): Result<T, DtoValidationError> {
    // Using `whitelist: true` might seem like a good idea since it removes extra fields from the DTO.
    // However, it also strips any property that does not have a `class-validator` decorator.
    // This means you’d need to add `@Allow` for every field that doesn’t require validation
    // (e.g., computed fields).
    // In our case, `whitelist: true` is unnecessary because we explicitly assign allowed fields
    // in the constructor instead of using `class-transformer`’s `plainToInstance()` to populate the object.

    // const errors = validateSync(obj, { whitelist: true }); <-- DO NOT DO THIS
    const errors = validateSync(dto);
    if (errors.length > 0) {
      return Result.err(new DtoValidationError(errors));
    } else {
      return Result.ok(dto);
    }
  }

  static create(_: unknown): Result<unknown, DtoValidationError> {
    throw new Error("Unimplemented");
  }

  static fromJson(_: NetworkType): Result<unknown, DtoValidationError> {
    throw new Error("Unimplemented");
  }

  /**
   * Processes and validates nested DTO fields in a JSON object.
   * Automatically detects and handles both single objects and arrays of objects.
   * Each field is transformed using the provided DTO class's fromJson method.
   *
   * @param json - The raw JSON object containing fields to be processed
   * @param fields - Record mapping field names to their corresponding DTO classes
   * @returns Result<void, DtoValidationError> - Success (void) or validation error
   *
   * @example
   * ```typescript
   * // Single object field
   * const buildFieldResult = ADataTransferObj._buildDtoFields(json, {
   *   profilePhotos: MultiSizePhotoDTO
   * });
   * if (buildFieldResult.isErr) {
   *   return Result.err(buildFieldResult.error);
   * }
   * // json.profilePhotos is now a validated MultiSizePhotoDTO instance
   * ```
   *
   * @example
   * ```typescript
   * // Array of objects field
   * const buildFieldResult = ADataTransferObj._buildDtoFields(json, {
   *   images: MultiSizePhotoDTO
   * });
   * if (buildFieldResult.isErr) {
   *   return Result.err(buildFieldResult.error);
   * }
   * // json.images is now an array of validated MultiSizePhotoDTO instances
   * ```
   *
   * @example
   * ```typescript
   * // Multiple fields with mixed types
   * const buildFieldResult = ADataTransferObj._buildDtoFields(json, {
   *   profilePhotos: MultiSizePhotoDTO,    // Single object
   *   images: MultiSizePhotoDTO,           // Could be single or array - auto-detected
   *   documents: DocumentDTO,              // Another DTO type
   *   metadata: MetadataDTO
   * });
   * if (buildFieldResult.isErr) {
   *   return Result.err(buildFieldResult.error);
   * }
   * ```
   */
  protected static _buildDtoFields(
    json: NetworkType,
    fields: Record<string, { fromJson(json: NetworkType): Result<unknown, DtoValidationError> }>
  ): Result<void, DtoValidationError> {
    for (const field of Object.keys(fields)) {
      if (fields[field] == null) {
        continue;
      }
      const result = ADataTransferObj._buildDtoField(json, field, fields[field]);
      if (result.isErr) {
        return Result.err(result.error);
      }
    }
    return Result.ok(void 0);
  }

  private static _buildDtoField<T>(
    json: NetworkType,
    fieldName: string,
    DtoClass: { fromJson(json: NetworkType): Result<T, DtoValidationError> }
  ): Result<void, DtoValidationError> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    const data = json as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data[fieldName] == null) {
      return Result.ok(void 0);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (Array.isArray(data[fieldName])) {
      // Handle array of DTOs
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const arrayData = data[fieldName];

      const transformedArray: T[] = [];

      for (const el of arrayData) {
        const result = DtoClass.fromJson(el);
        if (result.isErr) {
          return Result.err(result.error);
        }
        transformedArray.push(result.value);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data[fieldName] = transformedArray;
    } else {
      // Handle single DTO object
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const result = DtoClass.fromJson(data[fieldName]);
      if (result.isErr) {
        return Result.err(result.error);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      data[fieldName] = result.value;
    }

    return Result.ok(void 0);
  }
}
