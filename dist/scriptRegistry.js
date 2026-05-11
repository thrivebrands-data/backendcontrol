import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expandUserPath } from "./pathUtil.js";
import { getDb, ensureObjectId, oidToStr } from "./mongo.js";
import { settings, ensureDirs } from "./config.js";
function defaultPythonExe() {
    if (process.env.PYTHON)
        return process.env.PYTHON;
    return process.platform === "win32" ? "python" : "python3";
}
export async function listScripts(userId) {
    const db = getDb();
    const items = await db
        .collection("scripts")
        .find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(1000)
        .toArray();
    return items.map((it) => oidToStr({ ...it }));
}
export async function addScript(userId, input) {
    const db = getDb();
    const now = new Date();
    const doc = {
        user_id: userId,
        name: input.name,
        path: input.path,
        type: input.type,
        created_at: now,
        last_run_at: null,
        last_status: null,
    };
    const res = await db.collection("scripts").insertOne(doc);
    return oidToStr({ ...doc, _id: res.insertedId });
}
export async function deleteScript(userId, scriptId) {
    const db = getDb();
    const oid = ensureObjectId(scriptId);
    await db.collection("scripts").deleteOne({ _id: oid, user_id: userId });
}
function quoteWin(s) {
    if (!/[\s"'\\]/.test(s))
        return s;
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function launchInTerminal(command, cwd) {
    const system = process.platform;
    if (system === "darwin") {
        const cd = cwd ? `cd ${quoteWin(cwd)} && ` : "";
        const script = `tell application "Terminal"
  activate
  do script ${JSON.stringify(cd + command)}
end tell`;
        spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" });
        return;
    }
    if (system === "win32") {
        spawn("cmd.exe", ["/c", "start", "cmd.exe", "/k", command], {
            cwd: cwd || undefined,
            detached: true,
            stdio: "ignore",
        });
        return;
    }
    spawn("x-terminal-emulator", ["-e", command], {
        cwd: cwd || undefined,
        detached: true,
        stdio: "ignore",
    });
}
export async function runScript(userId, scriptId) {
    const db = getDb();
    const oid = ensureObjectId(scriptId);
    const script = await db.collection("scripts").findOne({ _id: oid, user_id: userId });
    if (!script)
        return { error: "not_found" };
    ensureDirs();
    const now = new Date();
    const runDoc = {
        user_id: userId,
        kind: "script",
        target: scriptId,
        command: String(script.path),
        status: "started",
        started_at: now,
        finished_at: null,
        stdout_path: null,
        stderr_path: null,
        exit_code: null,
    };
    const runRes = await db.collection("runs").insertOne(runDoc);
    const runId = runRes.insertedId;
    const stdoutPath = path.join(settings.runsDir, `run_${String(runId)}_stdout.txt`);
    const stderrPath = path.join(settings.runsDir, `run_${String(runId)}_stderr.txt`);
    const scriptPath = path.resolve(expandUserPath(script.path));
    const parent = path.dirname(scriptPath);
    const cwd = fs.existsSync(parent) ? parent : undefined;
    const useTerminal = settings.launchScriptsInTerminal || process.platform === "win32";
    if (useTerminal) {
        const cmd = script.type === "python"
            ? `${quoteWin(defaultPythonExe())} ${quoteWin(scriptPath)}`
            : quoteWin(scriptPath);
        launchInTerminal(cmd, cwd);
        await db.collection("scripts").updateOne({ _id: oid, user_id: userId }, { $set: { last_run_at: new Date(), last_status: "running" } });
        return { run_id: String(runId), status: "started", launched_in_terminal: true };
    }
    const stdoutWs = fs.createWriteStream(stdoutPath);
    const stderrWs = fs.createWriteStream(stderrPath);
    const popenArgs = script.type === "python" ? [defaultPythonExe(), scriptPath] : [scriptPath];
    const proc = spawn(popenArgs[0], popenArgs.slice(1), {
        cwd,
        stdio: ["ignore", stdoutWs, stderrWs],
        shell: false,
    });
    await db.collection("runs").updateOne({ _id: runId, user_id: userId }, {
        $set: {
            status: "running",
            stdout_path: stdoutPath.replace(/\\/g, "/"),
            stderr_path: stderrPath.replace(/\\/g, "/"),
        },
    });
    await db.collection("scripts").updateOne({ _id: oid, user_id: userId }, { $set: { last_run_at: new Date(), last_status: "running" } });
    proc.on("close", async (rc) => {
        stdoutWs.end();
        stderrWs.end();
        const code = rc ?? 1;
        await db.collection("runs").updateOne({ _id: runId, user_id: userId }, {
            $set: {
                exit_code: code,
                status: code === 0 ? "success" : "failed",
                finished_at: new Date(),
            },
        });
        await db.collection("scripts").updateOne({ _id: oid, user_id: userId }, { $set: { last_status: code === 0 ? "success" : "failed" } });
    });
    return { run_id: String(runId), status: "started", launched_in_terminal: false };
}
