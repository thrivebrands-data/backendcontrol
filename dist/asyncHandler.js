import { sendDetail } from "./httpError.js";
export function asyncHandler(fn) {
    return (req, res, _next) => {
        void fn(req, res).catch((err) => sendDetail(res, err));
    };
}
