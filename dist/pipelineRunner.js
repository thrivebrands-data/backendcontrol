import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "./mongo.js";
import { settings, ensureDirs } from "./config.js";
function safeEnv(extra) {
    return { ...process.env, ...extra };
}
function quoteArgs(args) {
    return args
        .map((a) => {
        if (/[\s"'\\]/.test(a))
            return `"${a.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
        return a;
    })
        .join(" ");
}
export async function runPythonPipeline(userId, clientKey, cwd, command) {
    ensureDirs();
    const db = getDb();
    const startedAt = new Date();
    const runDoc = {
        user_id: userId,
        kind: "pipeline_python",
        target: clientKey,
        command: quoteArgs(command),
        status: "running",
        started_at: startedAt,
        finished_at: null,
        stdout_path: null,
        stderr_path: null,
        exit_code: null,
    };
    const runRes = await db.collection("runs").insertOne(runDoc);
    const runId = runRes.insertedId;
    const stdoutPath = path.join(settings.runsDir, `run_${String(runId)}_stdout.txt`);
    const stderrPath = path.join(settings.runsDir, `run_${String(runId)}_stderr.txt`);
    let stdout = "";
    let stderr = "";
    let exitCode = 1;
    try {
        stdout = String(execFileSync(command[0], command.slice(1), {
            cwd,
            env: safeEnv(),
            encoding: "utf-8",
            maxBuffer: 50 * 1024 * 1024,
        }));
        exitCode = 0;
    }
    catch (e) {
        const ex = e;
        exitCode = typeof ex.status === "number" ? ex.status : 1;
        stdout = ex.stdout != null ? String(ex.stdout) : "";
        stderr = ex.stderr != null ? String(ex.stderr) : "";
    }
    fs.writeFileSync(stdoutPath, stdout || "", "utf-8");
    fs.writeFileSync(stderrPath, stderr || "", "utf-8");
    const status = exitCode === 0 ? "success" : "failed";
    await db.collection("runs").updateOne({ _id: runId, user_id: userId }, {
        $set: {
            status,
            exit_code: exitCode,
            finished_at: new Date(),
            stdout_path: stdoutPath.replace(/\\/g, "/"),
            stderr_path: stderrPath.replace(/\\/g, "/"),
        },
    });
    return {
        run_id: String(runId),
        status,
        exit_code: exitCode,
        stdout,
        stderr,
    };
}
export async function startBatPipeline(userId, clientKey, cwd, batPath) {
    ensureDirs();
    const db = getDb();
    const startedAt = new Date();
    const runDoc = {
        user_id: userId,
        kind: "pipeline_bat",
        target: clientKey,
        command: batPath,
        status: "started",
        started_at: startedAt,
        finished_at: null,
        stdout_path: null,
        stderr_path: null,
        exit_code: null,
    };
    const runRes = await db.collection("runs").insertOne(runDoc);
    const runId = runRes.insertedId;
    const stdoutPath = path.join(settings.runsDir, `run_${String(runId)}_stdout.txt`);
    const stderrPath = path.join(settings.runsDir, `run_${String(runId)}_stderr.txt`);
    const stdoutWs = fs.createWriteStream(stdoutPath);
    const stderrWs = fs.createWriteStream(stderrPath);
    const popenArgs = process.platform === "win32" ? ["cmd.exe", "/c", batPath] : [batPath];
    const proc = spawn(popenArgs[0], popenArgs.slice(1), {
        cwd,
        env: safeEnv(),
        shell: false,
        stdio: ["ignore", stdoutWs, stderrWs],
    });
    await db.collection("runs").updateOne({ _id: runId, user_id: userId }, {
        $set: {
            status: "running",
            stdout_path: stdoutPath.replace(/\\/g, "/"),
            stderr_path: stderrPath.replace(/\\/g, "/"),
        },
    });
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
    });
    return { run_id: String(runId), status: "started" };
}
