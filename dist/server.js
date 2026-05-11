import { settings } from "./config.js";
import { closeMongo } from "./mongo.js";
import { createApp, initApp } from "./app.js";
async function main() {
    await initApp();
    const app = createApp();
    const server = app.listen(settings.port, "0.0.0.0", () => {
        console.log(`${settings.appName} listening on http://0.0.0.0:${settings.port}`);
    });
    const shutdown = async () => {
        server.close();
        await closeMongo();
        process.exit(0);
    };
    process.on("SIGINT", () => void shutdown());
    process.on("SIGTERM", () => void shutdown());
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
