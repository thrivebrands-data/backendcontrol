import path from "node:path";
import { Router } from "express";
import { getClientsMap } from "../clientsConfig.js";
import { settings } from "../config.js";
import { getDb } from "../mongo.js";
import { requireUserOid } from "../auth.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";
import { expandUserPath } from "../pathUtil.js";
import { runPythonPipeline, startBatPipeline } from "../pipelineRunner.js";

export const pipelineRouter = Router();

function clientCfg(clientKey: string): Record<string, unknown> {
  const clients = getClientsMap(settings.clientsConfigPath);
  const cfg = clients[clientKey];
  if (!cfg) throw new HttpError(404, "client_not_found");
  return cfg;
}

pipelineRouter.post(
  "/run/python",
  asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const { client } = req.body as { client?: string };
    if (!client) throw new HttpError(422, "validation_error");
    const cfg = clientCfg(client);
    const root = path.resolve(expandUserPath(String(cfg.root ?? ".")));
    const pipelineScript = cfg.pipeline_script;
    if (!pipelineScript) throw new HttpError(400, "pipeline_script_missing");
    const py = String(cfg.python ?? "python3");
    const command = [py, String(pipelineScript)];
    res.json(await runPythonPipeline(userId, client, root, command));
  })
);

pipelineRouter.post(
  "/run/bat",
  asyncHandler(async (req, res) => {
    const userId = await requireUserOid(req);
    const { client } = req.body as { client?: string };
    if (!client) throw new HttpError(422, "validation_error");
    const cfg = clientCfg(client);
    const root = path.resolve(expandUserPath(String(cfg.root ?? ".")));
    const db = getDb();
    const ov = await db.collection("client_overrides").findOne({ user_id: userId, client_key: client });
    const bat = (ov?.bat_path as string | null | undefined) || (cfg.bat as string | undefined);
    if (!bat) throw new HttpError(400, "bat_missing");
    const batPath = path.resolve(expandUserPath(bat));
    res.json(await startBatPipeline(userId, client, root, batPath));
  })
);
