import crypto from "node:crypto";
import type { Request } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "./mongo.js";
import { HttpError } from "./httpError.js";

function now(): Date {
  return new Date();
}

export async function createSession(userId: ObjectId): Promise<{ token: string }> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  await db.collection("sessions").insertOne({
    user_id: userId,
    token,
    created_at: now(),
  });
  return { token };
}

export function getBearerToken(req: Request): string {
  const auth = req.headers.authorization || req.headers.Authorization;
  const raw = Array.isArray(auth) ? auth[0] : auth;
  if (!raw || !raw.startsWith("Bearer ")) throw new HttpError(401, "missing_token");
  const token = raw.slice("Bearer ".length).trim();
  if (!token) throw new HttpError(401, "missing_token");
  return token;
}

export async function getCurrentUser(req: Request): Promise<{
  id: string;
  name?: unknown;
  email?: unknown;
  mobile?: unknown;
}> {
  const db = getDb();
  const token = getBearerToken(req);
  const session = await db.collection("sessions").findOne({ token });
  if (!session) throw new HttpError(401, "invalid_token");
  const user = await db.collection("users").findOne({ _id: session.user_id as ObjectId });
  if (!user) throw new HttpError(401, "invalid_token");
  const { _id, password: _pw, ...rest } = user as Record<string, unknown> & { _id: ObjectId };
  return { ...rest, id: String(_id) } as { id: string; name?: unknown; email?: unknown; mobile?: unknown };
}

export async function requireUserOid(req: Request): Promise<ObjectId> {
  const user = await getCurrentUser(req);
  return new ObjectId(user.id);
}
