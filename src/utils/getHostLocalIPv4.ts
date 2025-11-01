import { Nullable } from "@/types";
import os from "os";

let consoleLogFlag = true;

export function getHostLocalIPv4(): Nullable<string> {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface == null) continue;
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal && alias.address.startsWith("192.168.")) {
        candidates.push(alias.address);
      }
    }
  }
  if (candidates.length === 1) {
    if (consoleLogFlag) {
      console.log(`[I] found host unique lan address: ${candidates[0]}`);
      consoleLogFlag = false;
    }
    return candidates[0];
  } else if (candidates.length === 0) {
    console.warn("[W] no acceptable local address found: expected IPs in '192.168.0.0/16'");
  } else {
    console.warn(`[W] ambiguity: found ${candidates.length} interfaces in '192.168.0.0/16'`);
  }
  return null;
}
