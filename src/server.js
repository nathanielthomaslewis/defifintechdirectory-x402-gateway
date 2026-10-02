import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const cfg = loadConfig();
const app = await createApp();

app.listen(cfg.port, () => {
  console.log(`av-hub-x402 gateway on :${cfg.port}`);
  console.log(
    `  stubMode=${cfg.stubMode} listed=${cfg.listed} network=${cfg.network}`,
  );
  console.log(`  payTo=${cfg.payTo}`);
  console.log(`  usdc=${cfg.usdcAsset}`);
  if (!cfg.stubMode) console.log(`  facilitator=${cfg.facilitatorUrl}`);
});
