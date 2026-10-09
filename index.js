/**
 * Vercel Express framework entry — exports app (no listen).
 * Local: use `npm start` → src/server.js
 */
console.log('[boot] index.js module start');
import { createApp } from "./src/app.js";

const t0 = Date.now();
const app = await createApp();
console.log('[boot] createApp resolved in', Date.now() - t0, 'ms');
export default app;
