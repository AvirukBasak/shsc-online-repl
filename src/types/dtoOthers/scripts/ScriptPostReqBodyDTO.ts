import { ADataTransferObj } from "@/types/abstract";
import { DtoValidationError } from "@/types/errors";
import { LogType } from "@/types/typeEnums";
import { Result, NetworkType } from "@/types/util";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

interface ConstructorParams {
  type: LogType;
  message: string;
}

export class ScriptPostReqBodyDTO extends ADataTransferObj {
  @IsEnum(LogType)
  type: LogType;

  @IsString()
  @IsNotEmpty()
  message: string;

  private constructor(data: ConstructorParams) {
    super();

    this.type = data.type;
    this.message = data.message;
  }

  static override create(data: ConstructorParams): Result<ScriptPostReqBodyDTO, DtoValidationError> {
    return this.fromJson(data);
  }

  static override fromJson(json: NetworkType): Result<ScriptPostReqBodyDTO, DtoValidationError> {
    return ADataTransferObj._fromJson(new this(json as ConstructorParams));
  }
}
