import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
export function loadClientsConfig(configPath) {
    if (!fs.existsSync(configPath))
        return {};
    const text = fs.readFileSync(configPath, "utf-8");
    const ext = path.extname(configPath).toLowerCase();
    if (ext === ".yaml" || ext === ".yml") {
        return yaml.load(text) || {};
    }
    if (ext === ".json") {
        return JSON.parse(text);
    }
    throw new Error(`Unsupported clients config extension: ${ext}`);
}
export function getClientsMap(configPath) {
    const root = loadClientsConfig(configPath);
    const clients = root.CLIENTS;
    if (!clients || typeof clients !== "object")
        return {};
    return clients;
}
