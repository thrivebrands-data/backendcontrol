import type { Request, Response, RequestHandler } from "express";
import { sendDetail } from "./httpError.js";

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req, res, _next) => {
    void fn(req, res).catch((err: unknown) => sendDetail(res, err));
  };
}
