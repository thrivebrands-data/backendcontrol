import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import { getClientsMap } from "../clientsConfig.js";
import { settings } from "../config.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";
import { expandUserPath } from "../pathUtil.js";
import { parseLogFile } from "../logParser.js";

export const logsRouter = Router();

function clientCfg(clientKey: string): Record<string, unknown> {
  const clients = getClientsMap(settings.clientsConfigPath);
  const cfg = clients[clientKey];
  if (!cfg) throw new HttpError(404, "client_not_found");
  return cfg;
}

logsRouter.get(
  "/parsed",
  asyncHandler(async (req, res) => {
    const client = typeof req.query.client === "string" ? req.query.client : "";
    if (!client) throw new HttpError(422, "validation_error");
    const cfg = clientCfg(client);
    const logPath = cfg.log_path;
    if (!logPath) throw new HttpError(400, "log_path_missing");
    res.json(parseLogFile(path.resolve(expandUserPath(String(logPath)))));
  })
);

logsRouter.get(
  "/tail",
  asyncHandler(async (req, res) => {
    const client = typeof req.query.client === "string" ? req.query.client : "";
    if (!client) throw new HttpError(422, "validation_error");
    const cfg = clientCfg(client);
    const logPath = cfg.log_path;
    if (!logPath) throw new HttpError(400, "log_path_missing");
    const p = path.resolve(expandUserPath(String(logPath)));
    let lines = typeof req.query.lines === "string" ? parseInt(req.query.lines, 10) : 100;
    if (Number.isNaN(lines)) lines = 100;
    lines = Math.max(1, Math.min(lines, 2000));
    if (!fs.existsSync(p)) {
      res.json({ lines: [], meta: { error: "log_not_found" } });
      return;
    }
    const raw = fs.readFileSync(p, "utf-8");
    const rawLines = raw.split(/\r?\n/);
    res.json({
      lines: rawLines.slice(-lines),
      meta: { path: p, total_lines: rawLines.length },
    });
  })
);
