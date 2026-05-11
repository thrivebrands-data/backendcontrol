import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./mongo.js";
import { HttpError } from "./httpError.js";
function now() {
    return new Date();
}
export async function createSession(userId) {
    const db = getDb();
    const token = crypto.randomBytes(32).toString("base64url");
    await db.collection("sessions").insertOne({
        user_id: userId,
        token,
        created_at: now(),
    });
    return { token };
}
export function getBearerToken(req) {
    const auth = req.headers.authorization || req.headers.Authorization;
    const raw = Array.isArray(auth) ? auth[0] : auth;
    if (!raw || !raw.startsWith("Bearer "))
        throw new HttpError(401, "missing_token");
    const token = raw.slice("Bearer ".length).trim();
    if (!token)
        throw new HttpError(401, "missing_token");
    return token;
}
export async function getCurrentUser(req) {
    const db = getDb();
    const token = getBearerToken(req);
    const session = await db.collection("sessions").findOne({ token });
    if (!session)
        throw new HttpError(401, "invalid_token");
    const user = await db.collection("users").findOne({ _id: session.user_id });
    if (!user)
        throw new HttpError(401, "invalid_token");
    const { _id, password: _pw, ...rest } = user;
    return { ...rest, id: String(_id) };
}
export async function requireUserOid(req) {
    const user = await getCurrentUser(req);
    return new ObjectId(user.id);
}
