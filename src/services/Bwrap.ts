import fs from "fs";
import path from "path";
import { execSync, spawnSync, SpawnSyncReturns } from "child_process";
import { EnvSetup } from "./EnvSetup";
import { Nullable } from "@/types";

export class Bwrap {
  static create(env: EnvSetup, cwd: string): Bwrap {
    return new Bwrap(env, cwd);
  }

  readonly env: EnvSetup;
  readonly cwd: string;

  private constructor(env: EnvSetup, cwd: string) {
    this.env = env;
    this.cwd = cwd;
  }

  /**
   * Returns command and args that can be used directly with spawn.
   * @param {string[]} commandAndArgs Command with args to run inside bwrap
   * @returns {string[]} Array of arguments to pass to execFile("bwrap", args, ...)
   */
  build(
    command: { insideBwrap: string; outsideBwrap: string },
    ...args: string[]
  ): { command: string; args: string[] } {
    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    const bwrapTest = this.testBwrap();

    switch (bwrapTest.status) {
      case "LOCAL": {
        const bwrapPath = bwrapTest.path;
        const bwrapArgs = this.buildArgs(command.insideBwrap, ...args);
        return { command: bwrapPath, args: bwrapArgs };
      }
      case "BUNDLED": {
        const bwrapPath = bwrapTest.path;
        const ldLinuxPath = bwrapTest.ldLinux;
        const bwrapArgs = this.buildArgs(command.insideBwrap, ...args);
        if (ldLinuxPath != null) {
          return { command: ldLinuxPath, args: ["--library-path", EnvSetup.TmpLibDir, bwrapPath, ...bwrapArgs] };
        } else {
          return { command: bwrapPath, args: bwrapArgs };
        }
      }
      case "N/A": {
        const ldLinuxPath = this.findLdLinux();
        if (ldLinuxPath != null) {
          return { command: ldLinuxPath, args: ["--library-path", EnvSetup.TmpLibDir, command.outsideBwrap, ...args] };
        } else {
          return { command: command.outsideBwrap, args };
        }
      }
    }
  }

  /**
   * Returns path to bwrap and ld-linux as needed depending on which bwrap is being used.
   * @returns Status and path to bwrap and ld-linux
   */
  private testBwrap():
    | { status: "LOCAL"; path: string; ldLinux: null }
    | { status: "BUNDLED"; path: string; ldLinux: Nullable<string> }
    | { status: "N/A"; path: null; ldLinux: null } {
    if (EnvSetup.TmpBinDir == null) {
      throw new Error("EnvSetup.TmpBinDir is null");
    }

    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    // Try preinstalled bwrap
    try {
      const bwrapPath = execSync("command -v bwrap", { encoding: "utf-8" });
      return { status: "LOCAL", path: bwrapPath, ldLinux: null };
    } catch (error) {
      console.warn("[W] Runner.getBwrapPath: bwrap not installed");
      console.warn(error);
    }

    // Else try running bundled bwrap
    // prettier-ignore
    const testArgs = this.buildArgs(
      `/${EnvSetup.DirNames.BINDIR}/${EnvSetup.BinaryNames.INTERPRETER}`,
      "--version"
    );

    const env = { ...process.env, LD_LIBRARY_PATH: EnvSetup.TmpLibDir, LD_DEBUG: "libs" };
    const bwrapPath = path.resolve(EnvSetup.TmpBinDir, EnvSetup.BinaryNames.BWRAP);

    const ldLinuxPath = this.findLdLinux();
    let bwrapResult: Nullable<SpawnSyncReturns<string>> = null;
    if (ldLinuxPath != null) {
      bwrapResult = spawnSync(ldLinuxPath, ["--library-path", EnvSetup.TmpLibDir, bwrapPath, ...testArgs], {
        encoding: "utf-8",
        env,
      });
    } else {
      bwrapResult = spawnSync(bwrapPath, testArgs, {
        encoding: "utf-8",
        env,
      });
    }

    if (bwrapResult.status === 0) {
      // console.warn(bwrapResult.output.join("\n"));
      return { status: "BUNDLED", path: bwrapPath, ldLinux: ldLinuxPath };
    }

    // Else return null
    else {
      console.warn("[W] Runner.getBwrapPath: bundled bwrap check failed");
      console.warn(bwrapResult);
      return { status: "N/A", path: null, ldLinux: null };
    }
  }

  /**
   * Takes commands and returns args to bwrap hich can then be used to
   * immediately invoke bwrap over said command with pre-configured flags.
   * @param commandAndArgs Command to run in bwra and args to the command
   * @returns Args for Bwrap
   */
  private buildArgs(...commandAndArgs: string[]): string[] {
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

  private findLdLinux(): Nullable<string> {
    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    const ldLinuxPath = path.resolve(EnvSetup.TmpLibDir, EnvSetup.BinaryNames.LD_LINUX);
    if (fs.existsSync(ldLinuxPath)) {
      return ldLinuxPath;
    }
    return null;
  }
}
