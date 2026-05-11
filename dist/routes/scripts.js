import { Router } from "express";
import { requireUserOid } from "../auth.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";
import { addScript, deleteScript, listScripts, runScript } from "../scriptRegistry.js";
export const scriptsRouter = Router();
scriptsRouter.get("/", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    res.json(await listScripts(userId));
}));
scriptsRouter.post("/", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const { name, path: scriptPath, type } = req.body;
    if (!name || !scriptPath)
        throw new HttpError(422, "validation_error");
    res.json(await addScript(userId, { name, path: scriptPath, type: type || "python" }));
}));
scriptsRouter.delete("/:scriptId", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    await deleteScript(userId, req.params.scriptId);
    res.json({ ok: true });
}));
scriptsRouter.post("/run/:scriptId", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const result = await runScript(userId, req.params.scriptId);
    if ("error" in result)
        throw new HttpError(404, "script_not_found");
    res.json(result);
}));
