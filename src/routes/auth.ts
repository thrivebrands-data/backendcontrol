import { Router } from "express";
import { MongoServerError } from "mongodb";
import { getDb } from "../mongo.js";
import { createSession, getBearerToken, getCurrentUser } from "../auth.js";
import { HttpError } from "../httpError.js";
import { asyncHandler } from "../asyncHandler.js";

export const authRouter = Router();

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, mobile, email, password } = req.body as Record<string, string>;
    if (!name?.trim() || !mobile?.trim() || !email?.trim() || password == null || password === "") {
      throw new HttpError(422, "validation_error");
    }
    const db = getDb();
    const now = new Date();
    const doc = {
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      password,
      created_at: now,
      updated_at: now,
    };
    try {
      const ins = await db.collection("users").insertOne(doc);
      const session = await createSession(ins.insertedId);
      res.json({
        token: session.token,
        user: {
          id: String(ins.insertedId),
          name: doc.name,
          email: doc.email,
          mobile: doc.mobile,
        },
      });
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) {
        throw new HttpError(400, "user_exists");
      }
      throw e;
    }
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email_or_mobile: keyRaw, password } = req.body as { email_or_mobile?: string; password?: string };
    const key = keyRaw?.trim() || "";
    if (key.length < 3 || password == null || password === "") {
      throw new HttpError(422, "validation_error");
    }
    const db = getDb();
    const user = await db.collection("users").findOne({
      $or: [{ email: key.toLowerCase() }, { mobile: key }],
    });
    if (!user || user.password !== password) {
      throw new HttpError(401, "invalid_credentials");
    }
    const session = await createSession(user._id);
    res.json({
      token: session.token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  })
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req);
    res.json({ user });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const token = getBearerToken(req);
    await db.collection("sessions").deleteOne({ token });
    res.json({ ok: true });
  })
);
