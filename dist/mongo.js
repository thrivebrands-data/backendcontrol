import { MongoClient, ObjectId } from "mongodb";
import { settings } from "./config.js";
import { HttpError } from "./httpError.js";
let client = null;
let db = null;
export function getDb() {
    if (!db)
        throw new Error("MongoDB is not initialized");
    return db;
}
export async function initMongo() {
    if (db)
        return;
    if (!settings.mongodbUri)
        throw new Error("MONGODB_URI is not set");
    client = new MongoClient(settings.mongodbUri);
    await client.connect();
    db = client.db(settings.mongodbDb);
    await db.collection("users").createIndex("email", { unique: true, sparse: true });
    await db.collection("users").createIndex("mobile", { unique: true, sparse: true });
    await db.collection("sessions").createIndex("token", { unique: true });
    await db.collection("projects").createIndex({ user_id: 1, updated_at: -1 });
    await db.collection("scripts").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("runs").createIndex({ user_id: 1, started_at: -1 });
    await db.collection("client_overrides").createIndex({ user_id: 1, client_key: 1 }, { unique: true });
}
export async function closeMongo() {
    if (client)
        await client.close();
    client = null;
    db = null;
}
export function oidToStr(doc) {
    const out = { ...doc };
    if ("_id" in out && out._id != null) {
        out.id = String(out._id);
        delete out._id;
    }
    if ("user_id" in out && out.user_id != null) {
        out.user_id = String(out.user_id);
    }
    return out;
}
export function ensureObjectId(idStr) {
    try {
        return new ObjectId(idStr);
    }
    catch {
        throw new HttpError(400, "invalid_id");
    }
}
