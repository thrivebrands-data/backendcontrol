import mysql from "mysql2/promise";
import { getDb } from "./mongo.js";
import { settings } from "./config.js";
export async function saveMysqlConfig(userId, cfg) {
    const db = getDb();
    const doc = { user_id: userId, ...cfg };
    await db.collection("mysql_configs").updateOne({ user_id: userId }, { $set: doc }, { upsert: true });
}
export async function getMysqlConfig(userId) {
    const db = getDb();
    const row = await db.collection("mysql_configs").findOne({ user_id: userId });
    if (row) {
        return {
            host: String(row.host),
            user: String(row.user),
            password: String(row.password),
            db: String(row.db),
            port: Number(row.port ?? 3306),
        };
    }
    if (settings.mysqlHost && settings.mysqlUser && settings.mysqlPassword && settings.mysqlDb) {
        return {
            host: settings.mysqlHost,
            user: settings.mysqlUser,
            password: settings.mysqlPassword,
            db: settings.mysqlDb,
            port: settings.mysqlPort,
        };
    }
    return null;
}
export async function testConnection(cfg) {
    const conn = await mysql.createConnection({
        host: cfg.host,
        user: cfg.user,
        password: cfg.password,
        database: cfg.db,
        port: cfg.port,
        connectTimeout: 5000,
    });
    await conn.end();
}
export async function listTables(cfg) {
    const conn = await mysql.createConnection({
        host: cfg.host,
        user: cfg.user,
        password: cfg.password,
        database: cfg.db,
        port: cfg.port,
    });
    try {
        const [rows] = await conn.query("SHOW TABLES;");
        return rows.map((r) => String(Object.values(r)[0]));
    }
    finally {
        await conn.end();
    }
}
