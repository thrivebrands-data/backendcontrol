import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp, initApp } from "../src/app.js";

const app = createApp();
let initPromise: Promise<void> | null = null;

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!initPromise) initPromise = initApp();
  initPromise
    .then(() => app(req, res))
    .catch((err) => {
      console.error("Vercel function init failed:", err);
      res.status(500).json({
        ok: false,
        error: "init_failed",
        message: err instanceof Error ? err.message : String(err),
      });
    });
}

