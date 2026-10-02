/**
 * Optional official @x402/express middleware bootstrap.
 * Activated when STUB_MODE=0 and USE_X402_MIDDLEWARE=1.
 * Falls back silently if packages fail to load so STUB_MODE deploys stay healthy.
 */

import { TOOLS, TOOL_IDS } from "./tools.js";
import { CDP_FACILITATOR_URL, PAYAI_FACILITATOR_URL } from "./config.js";

/**
 * Build route map for paymentMiddleware / createX402Server.
 * @param {ReturnType<import('./config.js').loadConfig>} cfg
 */
export function buildX402Routes(cfg) {
  /** @type {Record<string, object>} */
  const routes = {};
  for (const id of TOOL_IDS) {
    const tool = TOOLS[id];
    const entry = {
      accepts: [
        {
          scheme: "exact",
          price: tool.priceUsd,
          network: cfg.network,
          payTo: cfg.payTo,
        },
      ],
      description: tool.description,
      mimeType: "application/json",
    };
    routes[`GET /tools/${id}`] = entry;
    routes[`POST /tools/${id}`] = entry;
  }
  return routes;
}

/**
 * Attach official x402 Express middleware when possible.
 * @returns {Promise<boolean>} true if middleware attached
 */
export async function tryAttachX402Middleware(app, cfg) {
  if (cfg.stubMode) return false;
  if (process.env.USE_X402_MIDDLEWARE !== "1") return false;

  try {
    const [{ paymentMiddleware, x402ResourceServer }, { ExactEvmScheme }, { HTTPFacilitatorClient }] =
      await Promise.all([
        import("@x402/express"),
        import("@x402/evm/exact/server"),
        import("@x402/core/server"),
      ]);

    let facilitatorClient;

    // Prefer CDP authenticated client when keys present
    if (cfg.cdpApiKeyId && cfg.cdpApiKeySecret) {
      try {
        const { createCdpFacilitatorClient } = await import("@coinbase/cdp-sdk/x402");
        facilitatorClient = createCdpFacilitatorClient({
          apiKeyId: cfg.cdpApiKeyId,
          apiKeySecret: cfg.cdpApiKeySecret,
        });
        console.log("[x402] using createCdpFacilitatorClient");
      } catch (err) {
        console.warn(
          "[x402] createCdpFacilitatorClient unavailable, HTTPFacilitatorClient:",
          err?.message || err,
        );
      }
    }

    if (!facilitatorClient) {
      const url =
        cfg.facilitatorUrl ||
        (cfg.facilitatorProvider === "payai"
          ? PAYAI_FACILITATOR_URL
          : CDP_FACILITATOR_URL);
      facilitatorClient = new HTTPFacilitatorClient({ url });
      console.log("[x402] HTTPFacilitatorClient →", url);
    }

    const server = new x402ResourceServer(facilitatorClient).register(
      cfg.network,
      new ExactEvmScheme(),
    );

    app.use(paymentMiddleware(buildX402Routes(cfg), server));
    console.log("[x402] official @x402/express middleware attached");
    return true;
  } catch (err) {
    console.warn(
      "[x402] official middleware not attached; using hardened verify/settle routes:",
      err?.message || err,
    );
    return false;
  }
}

/**
 * Alternate: createX402Server from CDP SDK (needs keys + optional USE_CDP_X402_SERVER=1).
 */
export async function tryCreateCdpX402Server(cfg) {
  if (cfg.stubMode || process.env.USE_CDP_X402_SERVER !== "1") return null;
  if (!cfg.cdpApiKeyId || !cfg.cdpApiKeySecret) return null;

  try {
    const { createX402Server } = await import("@coinbase/cdp-sdk/x402");
    const { paymentMiddlewareFromHTTPServer } = await import("@x402/express");

    const routes = {};
    for (const id of TOOL_IDS) {
      const tool = TOOLS[id];
      const conf = {
        price: tool.priceUsd,
        networks: [cfg.network],
        description: tool.description,
      };
      routes[`GET /tools/${id}`] = conf;
      routes[`POST /tools/${id}`] = conf;
    }

    const server = await createX402Server({
      environment: cfg.network === "eip155:8453" ? "production" : "development",
      payToConfig: { type: "address", evm: cfg.payTo },
      routes,
    });

    return { server, paymentMiddlewareFromHTTPServer };
  } catch (err) {
    console.warn("[x402] createX402Server failed:", err?.message || err);
    return null;
  }
}
