import fs from "node:fs";
import { Router } from "express";
import { getDb, ensureObjectId, oidToStr } from "../mongo.js";
import { requireUserOid } from "../auth.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";
export const runsRouter = Router();
function readFileSafe(p) {
    if (!p)
        return "";
    try {
        if (!fs.existsSync(p))
            return "";
        return fs.readFileSync(p, "utf-8");
    }
    catch {
        return "";
    }
}
runsRouter.get("/:runId", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const oid = ensureObjectId(req.params.runId);
    const db = getDb();
    const run = await db.collection("runs").findOne({ _id: oid, user_id: userId });
    if (!run)
        throw new HttpError(404, "run_not_found");
    const r = oidToStr({ ...run });
    res.json({
        id: r.id,
        kind: r.kind,
        target: r.target,
        command: r.command,
        status: r.status,
        started_at: r.started_at,
        finished_at: r.finished_at,
        exit_code: r.exit_code,
        stdout: readFileSafe(r.stdout_path),
        stderr: readFileSafe(r.stderr_path),
    });
}));
