import { Router } from "express";
import { getDb, ensureObjectId, oidToStr } from "../mongo.js";
import { requireUserOid } from "../auth.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";

export const projectsRouter = Router();

const VALID_TABS = new Set(["Live", "Inactive", "Down", "Pipeline"]);

function validateTab(tab: string): void {
  if (!VALID_TABS.has(tab)) throw new HttpError(400, "invalid_tab");
}

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const tab = typeof req.query.tab === "string" ? req.query.tab : undefined;
    const q: Record<string, unknown> = { user_id: userId };
    if (tab) {
      validateTab(tab);
      q.tab = tab;
    }
    const db = getDb();
    const items = await db
      .collection("projects")
      .find(q)
      .sort({ updated_at: -1 })
      .limit(1000)
      .toArray();
    res.json(items.map((it) => oidToStr({ ...it })));
  })
);

projectsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const b = req.body as Record<string, unknown>;
    const tab = String(b.tab || "");
    validateTab(tab);
    const now = new Date();
    const doc = {
      user_id: userId,
      tab,
      project: b.project,
      task_features: b.task_features,
      phase: b.phase ?? null,
      department: b.department ?? null,
      req_ref: b.req_ref ?? null,
      status: b.status ?? null,
      remark: b.remark ?? null,
      created_at: now,
      updated_at: now,
    };
    const db = getDb();
    const ins = await db.collection("projects").insertOne(doc);
    res.json(oidToStr({ ...doc, _id: ins.insertedId }));
  })
);

projectsRouter.put(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const oid = ensureObjectId(req.params.projectId);
    const b = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    for (const k of ["tab", "project", "task_features", "phase", "department", "req_ref", "status", "remark"]) {
      if (k in b && b[k] !== undefined) data[k] = b[k];
    }
    if (data.tab != null) validateTab(String(data.tab));
    data.updated_at = new Date();
    const db = getDb();
    const upd = await db.collection("projects").updateOne({ _id: oid, user_id: userId }, { $set: data });
    if (upd.matchedCount === 0) throw new HttpError(404, "project_not_found");
    const updated = await db.collection("projects").findOne({ _id: oid, user_id: userId });
    if (!updated) throw new HttpError(404, "project_not_found");
    res.json(oidToStr({ ...updated }));
  })
);

projectsRouter.delete(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const oid = ensureObjectId(req.params.projectId);
    const db = getDb();
    const del = await db.collection("projects").deleteOne({ _id: oid, user_id: userId });
    if (del.deletedCount === 0) throw new HttpError(404, "project_not_found");
    res.json({ ok: true });
  })
);
