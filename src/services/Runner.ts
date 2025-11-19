import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { EnvSetup } from "@/services/EnvSetup";
import { CustomApiError } from "@/types/errors";
import { Nullable } from "@/types";
import { Bwrap } from "./Bwrap";

export interface ExecResult {
  code: string;
  stdout?: Nullable<string>;
  stderr?: Nullable<string>;
}

export class Runner {
  // ------------------ static --------------------

  static init(): void {
    EnvSetup.init();

    if (EnvSetup.TmpBinDir == null) {
      throw new Error("EnvSetup.TmpBinDir is null");
    }

    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    // This generates binaries inside /tmp/runner/bundled-bin
    {
      // this is the path to the binary file resource
      const binResDir = path.resolve(process.cwd(), EnvSetup.ResDirPaths.BIN);
      // this is where he binary file will be copied to for exec
      const binTmpDir = path.resolve(EnvSetup.TmpBinDir);
      // list of all lib files
      const resbinNames = fs
        .readdirSync(binResDir)
        .filter((name) => fs.statSync(path.resolve(binResDir, name)).isFile());
      // list of content in the target dir
      const targetBinNames = fs.readdirSync(binTmpDir);

      // copy bin (if missing) and mark executable
      if (resbinNames.length > targetBinNames.length) {
        for (const name of resbinNames) {
          const readPath = path.resolve(binResDir, name);
          const writePath = path.resolve(binTmpDir, name);
          if (!fs.existsSync(writePath)) {
            // copy to tmp location
            fs.copyFileSync(readPath, writePath);
            // mark executable
            fs.chmodSync(writePath, 0o755);
          }
        }
      }
    }

    // This generates libraries inside /tmp/runner/bundled-lib
    {
      // this is the path to the lib file resource
      const libResDir = path.resolve(process.cwd(), EnvSetup.ResDirPaths.LIB);
      // this is where he lib file will be copied to for exec
      const libTmpDir = path.resolve(EnvSetup.TmpLibDir);
      // list of all lib files
      const resLibNames = fs
        .readdirSync(libResDir)
        .filter((name) => fs.statSync(path.resolve(libResDir, name)).isFile());
      // list of content in the target dir
      const targetLibNames = fs.readdirSync(libTmpDir);

      // copy the lib and mark executable
      if (resLibNames.length > targetLibNames.length) {
        for (const name of resLibNames) {
          const readPath = path.resolve(libResDir, name);
          const writePath = path.resolve(libTmpDir, name);
          if (!fs.existsSync(writePath)) {
            // copy to tmp location
            fs.copyFileSync(readPath, writePath);
            // mark executable
            fs.chmodSync(writePath, 0o755);
          }
        }
      }
    }
  }

  static create(uid: string): Runner {
    Runner.init();
    return new Runner(uid);
  }

  // ------------------ members --------------------

  readonly env: EnvSetup;
  readonly bwrap: Bwrap;
  readonly cwd: string;

  private constructor(uid: string) {
    this.env = EnvSetup.create(uid);
    this.cwd = process.cwd();
    this.bwrap = Bwrap.create(this.env, this.cwd);
  }

  destroy(): void {
    this.env.destroy();
  }

  run(code: string, stdin?: Nullable<string>): ExecResult {
    if (EnvSetup.TmpBinDir == null) {
      throw new Error("Runner.TmpBinPath is null");
    }

    if (EnvSetup.TmpLibDir == null) {
      throw new Error("Runner.TmpLibDir is null");
    }

    /** Create temporary file `/tmp/runner/<uid>/cwd/code.shsc` */
    const codeFilePath = path.resolve(this.env.sandboxWorkingDir, EnvSetup.CODEFILE_NAME);

    // Write code to /tmp/runner/<uid>/cwd/code.shsc
    if (!fs.existsSync(codeFilePath)) {
      fs.writeFileSync(codeFilePath, code);
    }

    const insideBwrap = {
      cmd: `/${EnvSetup.DirNames.BINDIR}/${EnvSetup.BinaryNames.INTERPRETER}`,
      // cmd: path.resolve(EnvSetup.TmpBinDir, EnvSetup.BinaryNames.INTERPRETER),
      args: [EnvSetup.CODEFILE_NAME],
    };
    const outsideBwrap = {
      cmd: path.resolve(EnvSetup.TmpBinDir, EnvSetup.BinaryNames.INTERPRETER),
      args: [path.resolve(this.env.sandboxWorkingDir, EnvSetup.CODEFILE_NAME)],
    };

    const { cmd, args, env } = this.bwrap.build({ insideBwrap, outsideBwrap });
    const spawnResult = spawnSync(cmd, args, { encoding: "utf-8", env, input: stdin ?? "" });

    const stdout = this.env.sanitizePaths(spawnResult.stdout);
    const stderr = this.env.sanitizePaths(spawnResult.stderr);
    const exitcode = spawnResult.status;

    if (exitcode == null || exitcode != 0) {
      const code = String(exitcode ?? "HTTP 500");
      // some info on the error present
      if (stderr.length > 0 || stdout.length > 0 || exitcode != null) {
        // stdout present: shsc code o/p present
        // stderr present: shsc errors were printed
        // code present: even if no error or o/p printed, shsc exited with error
        return { code, stdout, stderr };
      }
      // no info on error present: unlikely an shsc error
      else {
        throw CustomApiError.create(500, "Internal Server Error", spawnResult.error);
      }
    } else {
      return { code: `${exitcode}`, stdout, stderr };
    }
  }
}
