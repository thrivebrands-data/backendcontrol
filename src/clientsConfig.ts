import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export function loadClientsConfig(configPath: string): Record<string, unknown> {
  if (!fs.existsSync(configPath)) return {};
  const text = fs.readFileSync(configPath, "utf-8");
  const ext = path.extname(configPath).toLowerCase();
  if (ext === ".yaml" || ext === ".yml") {
    return (yaml.load(text) as Record<string, unknown>) || {};
  }
  if (ext === ".json") {
    return JSON.parse(text) as Record<string, unknown>;
  }
  throw new Error(`Unsupported clients config extension: ${ext}`);
}

export function getClientsMap(configPath: string): Record<string, Record<string, unknown>> {
  const root = loadClientsConfig(configPath);
  const clients = root.CLIENTS;
  if (!clients || typeof clients !== "object") return {};
  return clients as Record<string, Record<string, unknown>>;
}
