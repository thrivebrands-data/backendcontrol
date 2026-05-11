import fs from "node:fs";
function parseKvBlock(lines) {
    const out = {};
    for (const line of lines) {
        if (!line.includes(":"))
            continue;
        const idx = line.indexOf(":");
        const k = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "_");
        const v = line.slice(idx + 1).trim();
        if (/^-?\d+$/.test(v))
            out[k] = parseInt(v, 10);
        else if (/^-?\d+\.\d+$/.test(v))
            out[k] = parseFloat(v);
        else
            out[k] = v;
    }
    return out;
}
const SECTION_TITLES = new Set(["STOCK DISTRIBUTION", "REPORT METRICS", "ORDERS SUMMARY"]);
function findBlock(lines, title) {
    const titleRe = new RegExp(`^\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
    const idx = lines.findIndex((ln) => titleRe.test(ln));
    if (idx === -1)
        return [];
    const block = [];
    for (let i = idx + 1; i < lines.length; i++) {
        const ln = lines[i];
        if (ln.trim() === "") {
            if (block.length)
                break;
            continue;
        }
        const stripped = ln.trim();
        if (/^[A-Z0-9 _-]{6,}$/.test(stripped) && SECTION_TITLES.has(stripped.toUpperCase()))
            break;
        block.push(ln);
    }
    return block;
}
export function parseLogFile(logPath) {
    if (!fs.existsSync(logPath)) {
        return { stock: {}, reports: {}, orders: {}, meta: { error: "log_not_found" } };
    }
    const text = fs.readFileSync(logPath, "utf-8");
    const lines = text.split(/\r?\n/).map((ln) => ln.replace(/\n$/, ""));
    const stockLines = findBlock(lines, "STOCK DISTRIBUTION");
    const reportsLines = findBlock(lines, "REPORT METRICS");
    const ordersLines = findBlock(lines, "ORDERS SUMMARY");
    return {
        stock: parseKvBlock(stockLines),
        reports: parseKvBlock(reportsLines),
        orders: parseKvBlock(ordersLines),
        meta: { path: logPath },
    };
}
