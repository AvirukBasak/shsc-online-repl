import os from "os";
import fs from "fs";
import path from "path";
import { Nullable } from "@/types";

export class EnvSetup {
  // ------------------ constants --------------------

  static readonly ResDirPaths = {
    /** `public/bin` */
    BIN: "public/bin",
    /** `public/lib` */
    LIB: "public/lib",
  };

  static readonly DirNames = {
    TMPDIR: "runner",
    BINDIR: "bundled-bin",
    LIBDIR: "bundled-lib",
    WORKINGDIR: "cwd",
  } as const;

  static readonly BinaryNames = {
    BWRAP: "bwrap",
    INTERPRETER: "shsc-linux",
  } as const;

  static readonly CODEFILE_NAME = "code.shsc";

  // ------------------ static --------------------

  /** `/tmp/runner` */
  static TmpDir: Nullable<string> = null;

  /** `/tmp/runner/bundled-bin` */
  static TmpBinDir: Nullable<string> = null;

  /** `/tmp/runner/bundled-lib` */
  static TmpLibDir: Nullable<string> = null;

  static init(): void {
    EnvSetup.TmpDir = path.resolve(os.tmpdir(), EnvSetup.DirNames.TMPDIR);
    if (!fs.existsSync(EnvSetup.TmpDir)) {
      fs.mkdirSync(EnvSetup.TmpDir, { recursive: true });
    }

    EnvSetup.TmpBinDir = path.resolve(EnvSetup.TmpDir, EnvSetup.DirNames.BINDIR);
    if (!fs.existsSync(EnvSetup.TmpBinDir)) {
      fs.mkdirSync(EnvSetup.TmpBinDir, { recursive: true });
    }

    EnvSetup.TmpLibDir = path.resolve(EnvSetup.TmpDir, EnvSetup.DirNames.LIBDIR);
    if (!fs.existsSync(EnvSetup.TmpLibDir)) {
      fs.mkdirSync(EnvSetup.TmpLibDir, { recursive: true });
    }
  }

  static create(uid: string): EnvSetup {
    EnvSetup.init();
    return new EnvSetup(uid);
  }

  // ------------------ members --------------------

  readonly uid: string;

  /** `/tmp/runner/<uid>` */
  readonly sandboxRootDir: string;

  /** `/tmp/runner/<uid>/cwd` */
  readonly sandboxWorkingDir: string;

  private constructor(uid: string) {
    if (EnvSetup.TmpDir == null) {
      throw new Error("EnvSetup.TmpDir is null");
    }

    this.uid = uid;

    // this is the tmp directory where all stuff will be kept
    this.sandboxRootDir = path.resolve(EnvSetup.TmpDir, uid);
    if (!fs.existsSync(this.sandboxRootDir)) {
      fs.mkdirSync(this.sandboxRootDir, { recursive: true });
    }

    // this is where uploaded code is kept (and ran)
    this.sandboxWorkingDir = path.resolve(this.sandboxRootDir, EnvSetup.DirNames.WORKINGDIR);
    if (!fs.existsSync(this.sandboxWorkingDir)) {
      fs.mkdirSync(this.sandboxWorkingDir, { recursive: true });
    }
  }

  sanitizePaths(str: string): string {
    return (
      str
        // if sandbox not appplied:
        .replaceAll(`${this.sandboxWorkingDir}`, "/cwd")
        .replaceAll(`${this.sandboxRootDir}`, "/")
        .replaceAll(`${EnvSetup.TmpBinDir}`, "/b-bin")
        .replaceAll(`${EnvSetup.TmpLibDir}`, "/b-lib")
        .replaceAll(`${EnvSetup.TmpDir}`, "")
        // if sandbox applied
        .replaceAll(`/${EnvSetup.DirNames.BINDIR}`, "/b-bin")
        .replaceAll(`/${EnvSetup.DirNames.LIBDIR}`, "/b-lib")
    );
  }

  destroy(): void {
    fs.rmSync(this.sandboxRootDir, { recursive: true });
  }
}
