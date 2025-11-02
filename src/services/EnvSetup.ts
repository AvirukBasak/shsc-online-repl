import os from "os";
import fs from "fs";
import path from "path";
import { Nullable } from "@/types";

export class EnvSetup {
  // ------------------ constants --------------------

  static readonly BIN_RES_DIR = process.cwd() + "/public/bin";
  static readonly TMP_DIR_NAME = "runner";
  static readonly BIN_NAME = "shsc-linux";
  static readonly CODEFILE_NAME = "code.shsc";

  static readonly BINDIR_NAME = "bin";
  static readonly WORKINGDIR_NAME = "cwd";

  // ------------------ static --------------------

  /** `/tmp/runner` */
  static TmpDir: Nullable<string> = null;

  /** `/tmp/runner/bin` */
  static TmpBinDir: Nullable<string> = null;

  static init(): void {
    EnvSetup.TmpDir = path.resolve(os.tmpdir(), EnvSetup.TMP_DIR_NAME);
    if (!fs.existsSync(EnvSetup.TmpDir)) {
      fs.mkdirSync(EnvSetup.TmpDir, { recursive: true });
    }

    EnvSetup.TmpBinDir = path.resolve(EnvSetup.TmpDir, EnvSetup.BINDIR_NAME);
    if (!fs.existsSync(EnvSetup.TmpBinDir)) {
      fs.mkdirSync(EnvSetup.TmpBinDir, { recursive: true });
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
    this.sandboxWorkingDir = path.resolve(this.sandboxRootDir, EnvSetup.WORKINGDIR_NAME);
    if (!fs.existsSync(this.sandboxWorkingDir)) {
      fs.mkdirSync(this.sandboxWorkingDir, { recursive: true });
    }
  }

  destory(): void {
    fs.rmSync(this.sandboxRootDir, { recursive: true });
  }
}
