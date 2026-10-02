/**
 * Vercel Express framework entry — exports app (no listen).
 * Local: use `npm start` → src/server.js
 */
import { createApp } from "./src/app.js";

const app = await createApp();
export default app;
