import fs from "fs";
import path from "path";
import { execFile, execSync } from "child_process";
import { Readable } from "stream";
import { EnvSetup } from "@/services/EnvSetup";
import { CustomApiError } from "@/types/errors";
import { Nullable } from "@/types";

export interface ExecResult {
  code?: Nullable<string | number>;
  stdout?: Nullable<string>;
  stderr?: Nullable<string>;
}

export class Runner {
  // ------------------ static --------------------

  /** `/tmp/runner/bin/shsc-linux` */
  static TmpBinPath: Nullable<string> = null;

  static init(): void {
    EnvSetup.init();

    if (EnvSetup.TmpBinDir == null) {
      throw new Error("EnvSetup.TmpBinDir is null");
    }

    // this is the path to the binary file resource
    const binResPath = path.resolve(EnvSetup.BIN_RES_DIR, EnvSetup.BIN_NAME);
    // this is where he binary file will be copied to for exec
    const binTmpPath = path.resolve(EnvSetup.TmpBinDir, EnvSetup.BIN_NAME);

    // copy the binary and mark executable: all this to discourage race condition
    if (!fs.existsSync(binTmpPath)) {
      const binTmpPathTemp = `${binTmpPath}.tmp.${process.pid}`;
      try {
        // copy to .tmp.pid location
        fs.copyFileSync(binResPath, binTmpPathTemp);
        // rename to `binTmpPath` coz renames are atomic
        fs.renameSync(binTmpPathTemp, binTmpPath);
        // mark executable
        fs.chmodSync(binTmpPath, 0o755);
      } finally {
        // rm .tmp.pid file (force; no errors if file doesnt exist)
        fs.rmSync(binTmpPathTemp, { force: true });
      }
    }

    Runner.TmpBinPath = binTmpPath;
  }

  static create(uid: string): Runner {
    Runner.init();
    return new Runner(uid);
  }

  // ------------------ members --------------------

  readonly env: EnvSetup;

  private constructor(uid: string) {
    this.env = EnvSetup.create(uid);
  }

  destroy(): void {
    this.env.destory();
  }

  async run(code: string, stdin?: Nullable<string>): Promise<ExecResult> {
    if (Runner.TmpBinPath == null) {
      throw new Error("Runner.TmpBinPath is null");
    }

    /** Create temporary file `/tmp/runner/<uid>/cwd/code.shsc` */
    const codeFilePath = path.resolve(this.env.sandboxWorkingDir, EnvSetup.CODEFILE_NAME);

    // Write code to /tmp/runner/<uid>/cwd/code.shsc
    if (!fs.existsSync(codeFilePath)) {
      fs.writeFileSync(codeFilePath, code);
    }

    let execFilePath: Nullable<string> = null;
    let execFileArgs: string[] = [];

    const bwrapPath = this.getBwrapPath();
    if (bwrapPath == null) {
      // bwrap absent: run without bwrap (unsafe)
      console.warn("[W] Runner: bwrap not found");
      execFilePath = Runner.TmpBinPath;
      execFileArgs = [codeFilePath];
    } else {
      execFilePath = bwrapPath;
      execFileArgs = this.getBwrapArgs();
    }

    const result = await new Promise<ExecResult>((resolve, reject) => {
      // Execute shsc with the code file, pass stdin
      const child = execFile(execFilePath, execFileArgs, (error, stdout, stderr) => {
        // this removes `codeFilePath` from o/p if present, else leaves as is
        stdout = stdout.replace(`${codeFilePath}`, "code.shsc");
        stderr = stderr.replace(`${codeFilePath}`, "code.shsc");
        // if error present (most likely)
        if (error != null) {
          const code = error.code;
          // some info on the error present
          if (stderr.length > 0 || stdout.length > 0 || error.code != null) {
            // stdout present: shsc code o/p present
            // stderr present: shsc errors were printed
            // code present: even if no error or o/p printed, shsc exited with error
            resolve({ code, stdout, stderr });
          }
          // no info on error present: unlikely an shsc error
          else {
            reject(CustomApiError.create(500, error.message, error));
          }
        }
        // ran without errors (perfectly written shsc code)
        else {
          resolve({ code: 0, stdout, stderr });
        }
      });

      const stdinStream = new Readable();
      if (stdin != null) {
        stdinStream.push(stdin);
        stdinStream.push(null);
        if (child.stdin != null) {
          stdinStream.pipe(child.stdin);
        }
      }
    });

    return result;
  }

  /**
   * Constructs a safe bwrap argument list for running a Shsc sandbox.
   * @returns {string[]} Array of arguments to pass to execFile("bwrap", args, ...)
   */
  getBwrapArgs(): string[] {
    if (EnvSetup.TmpBinDir == null) {
      throw new Error("EnvSetup.TmpBinDir is null");
    }

    // Build argument array for bubblewrap
    // prettier-ignore
    const args = [
      // sandbox root point
      "--bind", this.env.sandboxRootDir, "/",
      // make bin path the /bin of sandbox root
      "--ro-bind", EnvSetup.TmpBinDir, `/${EnvSetup.BINDIR_NAME}`,
      // fs mappings
      "--dev", "/dev",
      "--proc", "/proc",
      "--ro-bind", "/sys", "/sys",
      "--ro-bind", "/usr", "/usr",
      "--ro-bind", "/lib", "/lib",
      "--ro-bind", "/lib64", "/lib64",
      "--ro-bind", "/etc", "/etc",
      // new tmpfs at /tmp of sandbox root
      "--tmpfs", "/tmp",
      // nobody:nogroup <- removes previleges
      "--uid", "65534", "--gid", "65534",
      // more flags
      "--unshare-pid",
      "--unshare-net",
      "--unshare-user",
      "--die-with-parent",
      // cd and run script
      "--chdir", `/${EnvSetup.WORKINGDIR_NAME}`,
      `/${EnvSetup.BINDIR_NAME}/${EnvSetup.BIN_NAME}`, `${EnvSetup.CODEFILE_NAME}`
    ];

    return args;
  }

  /**
   * Checks if bubblewrap is installed and returns its absolute path.
   */
  getBwrapPath(): Nullable<string> {
    try {
      const pathStr = execSync("command -v bwrap", { encoding: "utf-8" }).trim();
      return pathStr;
    } catch {
      return null;
    }
  }
}
