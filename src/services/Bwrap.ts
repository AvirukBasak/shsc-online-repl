import path from "path";
import { execSync, spawnSync } from "child_process";
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
   * Encapsulates said command with required interprewter or bwrap depending on which is available.
   */
  build({
    insideBwrap,
    outsideBwrap,
  }: {
    insideBwrap: { cmd: string; args: string[] };
    outsideBwrap: { cmd: string; args: string[] };
  }): { cmd: string; args: string[]; env: NodeJS.ProcessEnv } {
    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    const bwrapPath = this.testBwrap();
    if (bwrapPath != null) {
      // With bwrap: use bundled lib so that bwrap can run
      const bwrapArgs = this.buildArgs(insideBwrap.cmd, ...insideBwrap.args);
      const env = { ...process.env, LD_LIBRARY_PATH: EnvSetup.TmpLibDir };
      return { cmd: bwrapPath, args: bwrapArgs, env };
    } else {
      // Without bwrap: use system lib so it doesn't interfere with shsc
      const env = process.env;
      return { cmd: outsideBwrap.cmd, args: outsideBwrap.args, env };
    }
  }

  /**
   * Returns path to bwrap.
   */
  private testBwrap(): Nullable<string> {
    if (EnvSetup.TmpBinDir == null) {
      throw new Error("EnvSetup.TmpBinDir is null");
    }

    if (EnvSetup.TmpLibDir == null) {
      throw new Error("EnvSetup.TmpLibDir is null");
    }

    // Try preinstalled bwrap
    try {
      const bwrapPath = execSync("command -v bwrap", { encoding: "utf-8" }).trim();
      console.info("[I] Runner.testBwrap: bwrap is installed");
      return bwrapPath;
    } catch (e) {
      const error = e as Error;
      console.warn("[W] Runner.testBwrap: bwrap not installed");
      console.warn("[W] Runner.testBwrap:", error.message);
    }

    // Else try running bundled bwrap
    const testArgs = this.buildArgs(`/${EnvSetup.DirNames.BINDIR}/${EnvSetup.BinaryNames.INTERPRETER}`, "--version");

    const env = { ...process.env, LD_LIBRARY_PATH: EnvSetup.TmpLibDir, LD_DEBUG: "libs" };
    const bwrapPath = path.resolve(EnvSetup.TmpBinDir, EnvSetup.BinaryNames.BWRAP);
    const bwrapResult = spawnSync(bwrapPath, testArgs, { encoding: "utf-8", env });

    if (bwrapResult.status === 0) {
      console.info("[I] Runner.testBwrap: bundled bwrap check passed");
      return bwrapPath;
    }

    // Else return null
    else {
      console.warn("[W] Runner.testBwrap: bundled bwrap check failed");
      console.warn("[W] Runner.testBwrap: Status:", bwrapResult.status);
      console.warn("[W] Runner.testBwrap: Output:\n" + bwrapResult.output.filter(Boolean).join("\n"));
      return null;
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
}
