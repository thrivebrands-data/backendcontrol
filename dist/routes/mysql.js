import { Router } from "express";
import { requireUserOid } from "../auth.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";
import { getMysqlConfig, listTables, saveMysqlConfig, testConnection } from "../mysqlService.js";
export const mysqlRouter = Router();
mysqlRouter.post("/connect", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const { host, user, password, db, port } = req.body;
    if (!host || !user || password == null || !db)
        throw new HttpError(422, "validation_error");
    const cfg = { host, user, password, db, port: port ?? 3306 };
    try {
        await testConnection(cfg);
    }
    catch (e) {
        throw new HttpError(400, `mysql_connection_failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    await saveMysqlConfig(userId, cfg);
    res.json({ ok: true });
}));
mysqlRouter.get("/tables", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const cfg = await getMysqlConfig(userId);
    if (!cfg)
        throw new HttpError(400, "mysql_not_configured");
    try {
        res.json({ tables: await listTables(cfg) });
    }
    catch (e) {
        throw new HttpError(400, `mysql_list_tables_failed: ${e instanceof Error ? e.message : String(e)}`);
    }
}));
