import os from "node:os";
import path from "node:path";
export function expandUserPath(p) {
    if (p === "~" || p.startsWith("~/"))
        return path.join(os.homedir(), p === "~" ? "" : p.slice(2));
    if (p.startsWith("~\\"))
        return path.join(os.homedir(), p.slice(2));
    return p;
}
