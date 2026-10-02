/**
 * Vercel serverless entry — exports Express app as default handler.
 * All routes rewrite here via vercel.json.
 */
import { createApp } from "../src/app.js";

const app = await createApp();

export default app;
