export class HttpError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "HttpError";
  }
}

export function sendDetail(res: import("express").Response, err: unknown): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ detail: err.detail });
    return;
  }
  console.error(err);
  res.status(500).json({ detail: "internal_error" });
}
