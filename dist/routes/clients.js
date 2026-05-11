import { Router } from "express";
import { getClientsMap } from "../clientsConfig.js";
import { settings } from "../config.js";
import { getDb } from "../mongo.js";
import { requireUserOid } from "../auth.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";
export const clientsRouter = Router();
clientsRouter.get("/clients", asyncHandler(async (_req, res) => {
    const cfg = getClientsMap(settings.clientsConfigPath);
    res.json({ clients: cfg });
}));
clientsRouter.get("/clients/overrides", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const db = getDb();
    const items = await db.collection("client_overrides").find({ user_id: userId }).limit(1000).toArray();
    const overrides = {};
    for (const it of items) {
        overrides[String(it.client_key)] = {
            bat_path: it.bat_path ?? null,
            updated_at: it.updated_at,
        };
    }
    res.json({ overrides });
}));
clientsRouter.post("/clients/overrides/bat", asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const { client, bat_path: batPath } = req.body;
    if (!client)
        throw new HttpError(422, "validation_error");
    const clients = getClientsMap(settings.clientsConfigPath);
    if (!(client in clients))
        throw new HttpError(404, "client_not_found");
    const db = getDb();
    const now = new Date();
    await db.collection("client_overrides").updateOne({ user_id: userId, client_key: client }, {
        $set: { bat_path: batPath ?? null, updated_at: now },
        $setOnInsert: { created_at: now },
    }, { upsert: true });
    res.json({ client, bat_path: batPath ?? null, updated_at: now });
}));
