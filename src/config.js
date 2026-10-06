import { createPrivateKey } from 'node:crypto';

/**
 * Production defaults for AV-Hub x402 gateway.
 * LISTED defaults false. Do not invent GMV. No private keys in chat.
 */

export const DEFAULT_PAY_TO =
  "0x96873Fb532C630aE88c5e8A5dF5ef430c92dfF32";

/** Base mainnet USDC (Circle official) */
export const USDC_BASE_MAINNET =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Base Sepolia USDC (test) */
export const USDC_BASE_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** Prefer CDP for mainnet. Never use https://x402.org/facilitator on mainnet. */
export const CDP_FACILITATOR_URL =
  "https://api.cdp.coinbase.com/platform/v2/x402";

/** PayAI alternative — no CDP keys required for basic verify/settle (merchant key optional). */
export const PAYAI_FACILITATOR_URL = "https://facilitator.payai.network";

export function loadConfig() {
  if (process.env.TEST_MODE && process.env.TEST_MODE !== 'week1') throw new Error('Invalid TEST_MODE');
  const testMode = process.env.TEST_MODE === 'week1' ? 'week1' : '';
  const network = process.env.NETWORK || "eip155:8453";
  const isMainnet = network === "eip155:8453";
  const stubMode = process.env.STUB_MODE !== "0";
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const missing = [];
  if (testMode === 'week1' && environment === 'production') {
    if (stubMode) missing.push('STUB_MODE=0');
    for (const name of ['PAY_TO', 'CDP_API_KEY_ID', 'CDP_API_KEY_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'HIT_LOG_SALT', 'OPERATOR_TOKEN']) {
      if (!process.env[name]) missing.push(name);
    }
    if (network !== 'eip155:8453') missing.push('NETWORK=eip155:8453');
    if (process.env.USDC_ASSET && process.env.USDC_ASSET.toLowerCase() !== USDC_BASE_MAINNET.toLowerCase()) missing.push('USDC_ASSET');
    if (!/^0x[0-9a-fA-F]{40}$/.test(process.env.PAY_TO || '')) missing.push('PAY_TO');
    try {
      const origin = new URL(process.env.GATEWAY_BASE_URL);
      if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') missing.push('GATEWAY_BASE_URL');
    } catch { missing.push('GATEWAY_BASE_URL'); }
    if ((process.env.HIT_LOG_SALT || '').length < 32) missing.push('HIT_LOG_SALT');
    if ((process.env.OPERATOR_TOKEN || '').length < 24) missing.push('OPERATOR_TOKEN');
    if (process.env.CDP_API_KEY_SECRET) {
      try {
        const secret = process.env.CDP_API_KEY_SECRET.replace(/\\n/g, '\n').trim();
        if (secret.includes('BEGIN')) {
          const key = createPrivateKey(secret);
          if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') missing.push('CDP_API_KEY_SECRET');
        } else if (Buffer.from(secret, 'base64').length !== 64) {
          missing.push('CDP_API_KEY_SECRET'); // Ed25519 keys are base64 of a 64-byte seed+public key
        }
      } catch { missing.push('CDP_API_KEY_SECRET'); }
    }
    if (missing.length) throw new Error(`Week1 production configuration missing or invalid: ${missing.join(', ')}`);
  }

  let facilitatorUrl =
    process.env.FACILITATOR_URL ||
    (stubMode
      ? PAYAI_FACILITATOR_URL
      : CDP_FACILITATOR_URL);

  // Hard guard: never default to x402.org on mainnet
  if (
    isMainnet &&
    !stubMode &&
    facilitatorUrl.includes("x402.org/facilitator")
  ) {
    throw new Error(
      "Refusing x402.org facilitator on mainnet. Set FACILITATOR_URL to CDP or PayAI.",
    );
  }

  const usdcAsset =
    process.env.USDC_ASSET ||
    (isMainnet ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA);

  return {
    environment,
    baseUrl: process.env.GATEWAY_BASE_URL || "http://127.0.0.1:4021",
    testMode,
    livePaymentsEnabled: testMode === 'week1' && !stubMode && !!(process.env.PAY_TO && process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET),
    disabledCapabilities: (process.env.DISABLED_CAPABILITIES || "").split(",").filter(Boolean),
    payTo: process.env.PAY_TO || DEFAULT_PAY_TO,
    network,
    usdcAsset,
    stubMode,
    listed: testMode === 'week1',
    facilitatorUrl,
    facilitatorProvider: process.env.FACILITATOR_PROVIDER || "cdp", // cdp | payai
    cdpApiKeyId: process.env.CDP_API_KEY_ID || "",
    cdpApiKeySecret: process.env.CDP_API_KEY_SECRET || "",
    operatorReadToken: process.env.OPERATOR_READ_TOKEN || "",
    operatorToken: process.env.OPERATOR_TOKEN || "",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    hitLogSalt: process.env.HIT_LOG_SALT || "",
    port: Number(process.env.PORT || 4021),
    serviceName: "av-hub-x402-gateway",
  };
}
