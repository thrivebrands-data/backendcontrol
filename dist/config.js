import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config();
const envRaw = (process.env.ENV || "dev").toLowerCase();
const env = envRaw === "prod" || envRaw === "test" ? envRaw : "dev";
const isVercel = String(process.env.VERCEL || "").toLowerCase() === "1" || Boolean(process.env.VERCEL);
const vercelBaseDir = "/tmp/thrive_control_backend";
export const settings = {
    appName: process.env.APP_NAME || "Thrive Control Center",
    env: env,
    corsOrigins: process.env.CORS_ORIGINS || "http://localhost:9875,http://127.0.0.1:9875",
    port: Number(process.env.PORT) || 9876,
    // On Vercel, only /tmp is writable.
    dataDir: path.resolve(process.env.DATA_DIR || (isVercel ? `${vercelBaseDir}/data` : "./data")),
    runsDir: path.resolve(process.env.RUNS_DIR || (isVercel ? `${vercelBaseDir}/data/runs` : "./data/runs")),
    clientsConfigPath: path.resolve(process.env.CLIENTS_CONFIG_PATH || "./clients.yaml"),
    mongodbUri: process.env.MONGODB_URI || "",
    mongodbDb: process.env.MONGODB_DB || "thrive_control_center",
    mysqlHost: process.env.MYSQL_HOST || "",
    mysqlUser: process.env.MYSQL_USER || "",
    mysqlPassword: process.env.MYSQL_PASSWORD || "",
    mysqlDb: process.env.MYSQL_DB || "",
    mysqlPort: Number(process.env.MYSQL_PORT) || 3306,
    launchScriptsInTerminal: String(process.env.LAUNCH_SCRIPTS_IN_TERMINAL || "").toLowerCase() === "true",
};
export function parseOrigins(origins) {
    return origins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
}
export function ensureDirs() {
    fs.mkdirSync(settings.dataDir, { recursive: true });
    fs.mkdirSync(settings.runsDir, { recursive: true });
}
