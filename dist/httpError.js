export class HttpError extends Error {
    status;
    detail;
    constructor(status, detail) {
        super(detail);
        this.status = status;
        this.detail = detail;
        this.name = "HttpError";
    }
}
export function sendDetail(res, err) {
    if (err instanceof HttpError) {
        res.status(err.status).json({ detail: err.detail });
        return;
    }
    console.error(err);
    res.status(500).json({ detail: "internal_error" });
}
