import fs from "fs";
import path from "path";
import { execSync, spawnSync, SpawnSyncReturns } from "child_process";
import { EnvSetup } from "@/services/EnvSetup";
import { CustomApiError } from "@/types/errors";
import { Nullable } from "@/types";

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
  readonly cwd: string;

  private constructor(uid: string) {
    this.env = EnvSetup.create(uid);
    this.cwd = process.cwd();
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

    let execFilePath: Nullable<string> = null;
    let execFileArgs: string[] = [];

    const bwrapPath = this.getBwrapPath();
    if (bwrapPath == null) {
      // bwrap absent: run without bwrap (unsafe)
      console.warn("[W] Runner.run: running without bwrap");
      // setup args
      execFilePath = path.resolve(EnvSetup.TmpBinDir, EnvSetup.BinaryNames.INTERPRETER);
      execFileArgs = [codeFilePath];
    } else {
      execFilePath = bwrapPath;
      execFileArgs = this.buildBwrapArgs(
        `/${EnvSetup.DirNames.BINDIR}/${EnvSetup.BinaryNames.INTERPRETER}`,
        `${EnvSetup.CODEFILE_NAME}`
      );

      // For debugging using strace
      // execFileArgs = this.buildBwrapArgs(
      //   "bash",
      //   "-c",
      //   `strace -e trace=open,openat,creat,write,rename /${EnvSetup.DirNames.BINDIR}/${EnvSetup.BinaryNames.INTERPRETER} ${EnvSetup.CODEFILE_NAME}`
      // );
    }

    const env = { ...process.env, LD_LIBRARY_PATH: EnvSetup.TmpLibDir };
    let spawnResult: Nullable<SpawnSyncReturns<string>> = null;

    spawnResult = spawnSync(execFilePath, execFileArgs, { encoding: "utf-8", env, input: stdin ?? "" });

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

  /**
   * Constructs a safe bwrap argument list for running a Shsc sandbox.
   * @param {string[]} commandAndArgs Command with args to run inside bwrap
   * @returns {string[]} Array of arguments to pass to execFile("bwrap", args, ...)
   */
  buildBwrapArgs(...commandAndArgs: string[]): string[] {
    if (EnvSetup.TmpBinDir == null) {
      throw new Error("EnvSetup.TmpBinDir is null");
    }

    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    // Build argument array for bubblewrap
    // prettier-ignore
    const args = [
      // sandbox root point
      "--bind", this.env.sandboxRootDir, "/",
      // make bin path the /bin of sandbox root
      "--ro-bind", EnvSetup.TmpBinDir, `/${EnvSetup.DirNames.BINDIR}`,
      // "--ro-bind", EnvSetup.TmpLibDir, `/${EnvSetup.DirNames.LIBDIR}`,
      // fs mappings
      "--dev", "/dev",
      "--proc", "/proc",
      "--ro-bind", "/bin", `/bin`,
      "--ro-bind", "/sys", "/sys",
      "--ro-bind", "/usr", "/usr",
      "--ro-bind", "/lib", "/lib",
      "--ro-bind", "/lib64", "/lib64",
      "--ro-bind", "/etc", "/etc",
      // new tmpfs at /tmp of sandbox root
      "--tmpfs", "/tmp",
      // nobody:nogroup <- removes previleges
      "--uid", "65534", "--gid", "65534",
      // setup env vars
      // "--setenv", "LD_LIBRARY_PATH", `/${EnvSetup.DirNames.LIBDIR}`,
      "--setenv", "PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      "--setenv", "TMPDIR", "/tmp",
      "--setenv", "HOME", `/${EnvSetup.DirNames.WORKINGDIR}`,
      // more flags
      "--unshare-pid",
      "--unshare-net",
      "--unshare-user",
      "--die-with-parent",
      // cd and run script
      "--chdir", `/${EnvSetup.DirNames.WORKINGDIR}`,
      // additonal args and commands
      ...commandAndArgs
    ];

    return args;
  }

  getBwrapPath(): Nullable<string> {
    if (EnvSetup.TmpBinDir == null) {
      throw new Error("EnvSetup.TmpBinDir is null");
    }

    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    // Try preinstalled bwrap
    try {
      const bwrapPath = execSync("command -v bwrap", { encoding: "utf-8" });
      return bwrapPath.trim();
    } catch (error) {
      console.warn("[W] Runner.getBwrapPath: bwrap not installed");
      console.warn(error);
    }

    // Else try running bundled bwrap
    // prettier-ignore
    const testArgs = this.buildBwrapArgs(
      `/${EnvSetup.DirNames.BINDIR}/${EnvSetup.BinaryNames.INTERPRETER}`,
      "--version"
    );

    const env = { ...process.env, LD_LIBRARY_PATH: EnvSetup.TmpLibDir, LD_DEBUG: "libs" };
    const bundledPath = path.resolve(EnvSetup.TmpBinDir, EnvSetup.BinaryNames.BWRAP);
    const bwrapResult = spawnSync(bundledPath, testArgs, { encoding: "utf-8", env });

    if (bwrapResult.status === 0) {
      // console.warn(bwrapResult.output.join("\n"));
      return bundledPath;
    }

    // Else return null
    else {
      console.warn("[W] Runner.getBwrapPath: bundled bwrap check failed");
      console.warn(bwrapResult);
      return null;
    }
  }
}
