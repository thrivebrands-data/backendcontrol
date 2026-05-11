import express from "express";
import cors from "cors";
import { settings, ensureDirs, parseOrigins } from "./config.js";
import { initMongo, closeMongo } from "./mongo.js";
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

async function main(): Promise<void> {
  ensureDirs();
  await initMongo();

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
        // In prod we expect either:
        // - frontend calls backend through Next proxy (/api -> backend): no browser CORS needed, but keeping CORS configured is harmless
        // - frontend calls backend directly: set CORS_ORIGINS to your frontend domain(s)
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

  const server = app.listen(settings.port, "0.0.0.0", () => {
    console.log(`${settings.appName} listening on http://0.0.0.0:${settings.port}`);
  });

  const shutdown = async () => {
    server.close();
    await closeMongo();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
