import express from "express";
import cors from "cors";
import { settings, ensureDirs, parseOrigins } from "./config.js";
import { initMongo } from "./mongo.js";
import { authRouter } from "./routes/auth.js";
import { clientsRouter } from "./routes/clients.js";
import { projectsRouter } from "./routes/projects.js";
import { scriptsRouter } from "./routes/scripts.js";
import { runsRouter } from "./routes/runs.js";
import { pipelineRouter } from "./routes/pipeline.js";
import { mysqlRouter } from "./routes/mysql.js";
import { logsRouter } from "./routes/logs.js";

const DEV_ORIGIN_RE =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  const corsBase = { credentials: true } as const;
  if (settings.env === "dev") {
    app.use(
      cors({
        ...corsBase,
        origin: (origin, cb) => {
          if (!origin) {
            cb(null, true);
            return;
          }
          const list = parseOrigins(settings.corsOrigins);
          if (list.includes(origin) || DEV_ORIGIN_RE.test(origin)) cb(null, true);
          else cb(null, false);
        },
      })
    );
  } else {
    app.use(
      cors({
        ...corsBase,
        origin: parseOrigins(settings.corsOrigins),
      })
    );
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true, name: settings.appName });
  });

  app.use("/auth", authRouter);
  app.use(clientsRouter);
  app.use("/projects", projectsRouter);
  app.use("/scripts", scriptsRouter);
  app.use("/runs", runsRouter);
  app.use("/pipeline", pipelineRouter);
  app.use("/mysql", mysqlRouter);
  app.use("/logs", logsRouter);

  return app;
}

export async function initApp(): Promise<void> {
  ensureDirs();
  await initMongo();
}

