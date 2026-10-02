/**
 * Express app factory — Vercel-safe (no listen here).
 * Routes: /health /tools /tools/:id /mcp/tools/call
 * listed:false by default. STUB_MODE=1 until CDP keys set.
 */

import express from "express";
import { TOOLS, TOOL_IDS } from "./tools.js";
import { loadConfig } from "./config.js";
import {
  paymentRequiredForTool,
  encodePaymentRequired,
  decodePaymentSignature,
  verifyPayment,
  settlePayment,
  encodePaymentResponse,
} from "./x402.js";
import {
  tryAttachX402Middleware,
  tryCreateCdpX402Server,
} from "./middleware.js";

export async function createApp(overrides = {}) {
  const cfg = { ...loadConfig(), ...overrides };
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Optional official middleware. When attached, it verifies/settles before handlers.
  let middlewareAttached = false;
  const cdpPkg = await tryCreateCdpX402Server(cfg);
  if (cdpPkg) {
    app.use(cdpPkg.paymentMiddlewareFromHTTPServer(cdpPkg.server));
    middlewareAttached = true;
  } else {
    middlewareAttached = await tryAttachX402Middleware(app, cfg);
  }
  app.locals.middlewareAttached = middlewareAttached;

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: cfg.serviceName,
      listed: cfg.listed,
      stubMode: cfg.stubMode,
      network: cfg.network,
      usdcAsset: cfg.usdcAsset,
      payTo: cfg.payTo,
      facilitatorUrl: cfg.stubMode ? null : cfg.facilitatorUrl,
      tools: TOOL_IDS,
      phase: 1,
      paymentsLive: !cfg.stubMode,
    });
  });

  app.get("/tools", (_req, res) => {
    res.json({
      listed: cfg.listed,
      network: cfg.network,
      payTo: cfg.payTo,
      tools: TOOL_IDS.map((id) => ({
        id,
        price: TOOLS[id].priceUsd,
        description: TOOLS[id].description,
        http: `POST /tools/${id}`,
        mcp: `mcp://av-hub/tool/${id}`,
      })),
    });
  });

  async function handleTool(req, res) {
    const toolId = req.params.toolId;
    const tool = TOOLS[toolId];
    if (!tool) {
      res.status(404).json({ error: "unknown_tool", toolId, known: TOOL_IDS });
      return;
    }

    const requirements = paymentRequiredForTool(toolId, cfg);
    const sigHeader =
      req.header("payment-signature") || req.header("PAYMENT-SIGNATURE");
    const payload = decodePaymentSignature(sigHeader);

    // When official middleware is attached it already 402'd or verified+settled.
    if (middlewareAttached) {
      const input = { ...(req.body || {}), ...(req.query || {}) };
      let result;
      try {
        result = tool.handler(input);
      } catch (err) {
        res.status(500).json({ error: "tool_failed", message: String(err?.message || err) });
        return;
      }
      res.status(200).json({
        ok: true,
        tool: toolId,
        price: tool.priceUsd,
        listed: cfg.listed,
        verification: { isValid: true, mode: "x402-middleware" },
        result,
      });
      return;
    }

    if (!sigHeader) {
      const encoded = encodePaymentRequired(requirements);
      res.setHeader("PAYMENT-REQUIRED", encoded);
      res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED");
      res.status(402).json({
        ...requirements,
        hint: cfg.stubMode
          ? "Retry with header PAYMENT-SIGNATURE: stub-ok"
          : "Sign USDC EIP-3009 auth and retry with PAYMENT-SIGNATURE (base64 PaymentPayload)",
        docs: "https://docs.cdp.coinbase.com/x402/seller/quickstart",
      });
      return;
    }

    const verification = await verifyPayment({ payload, requirements, cfg });
    if (!verification?.isValid) {
      const encoded = encodePaymentRequired(requirements);
      res.setHeader("PAYMENT-REQUIRED", encoded);
      res.status(402).json({
        error: "payment_invalid",
        detail: verification,
        ...requirements,
      });
      return;
    }

    const input = { ...(req.body || {}), ...(req.query || {}) };
    let result;
    try {
      result = tool.handler(input);
    } catch (err) {
      res
        .status(500)
        .json({ error: "tool_failed", message: String(err?.message || err) });
      return;
    }

    const settlement = await settlePayment({ payload, requirements, cfg });
    res.setHeader("PAYMENT-RESPONSE", encodePaymentResponse(settlement));
    res.setHeader(
      "Access-Control-Expose-Headers",
      "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
    );
    res.status(200).json({
      ok: true,
      tool: toolId,
      price: tool.priceUsd,
      listed: cfg.listed,
      verification: { isValid: true, mode: verification.mode || "live" },
      settlement,
      result,
    });
  }

  app.get("/tools/:toolId", handleTool);
  app.post("/tools/:toolId", handleTool);

  /**
   * MCP-shaped demo (not full MCP SSE). Payment in body._meta["x402/payment"].
   * Spec: https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/mcp.md
   */
  app.post("/mcp/tools/call", async (req, res) => {
    const toolId = req.body?.name;
    const tool = TOOLS[toolId];
    if (!tool) {
      res.status(404).json({ error: "unknown_tool", toolId });
      return;
    }

    const requirements = paymentRequiredForTool(toolId, cfg);
    const paymentMeta =
      req.body?._meta?.["x402/payment"] ||
      req.body?.arguments?._payment ||
      null;

    if (!paymentMeta) {
      res.json({
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ...requirements,
              transport: "mcp",
              hint: cfg.stubMode
                ? 'Retry with _meta["x402/payment"] = { "stub": true }'
                : "Attach signed PaymentPayload in _meta[x402/payment]",
            }),
          },
        ],
      });
      return;
    }

    const payload =
      paymentMeta === "stub-ok" || paymentMeta?.stub
        ? { stub: true }
        : paymentMeta;
    const verification = await verifyPayment({ payload, requirements, cfg });
    if (!verification?.isValid) {
      res.json({
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "payment_invalid", verification }),
          },
        ],
      });
      return;
    }

    const result = tool.handler(req.body?.arguments || {});
    const settlement = await settlePayment({ payload, requirements, cfg });
    res.json({
      isError: false,
      content: [{ type: "text", text: JSON.stringify(result) }],
      _meta: { "x402/payment-response": settlement },
    });
  });

  // Alias: single api host also serves /mcp as discovery hint
  app.get("/mcp", (_req, res) => {
    res.json({
      transport: "mcp-shaped-http",
      call: "POST /mcp/tools/call",
      listed: cfg.listed,
      tools: TOOL_IDS,
      note: "Full MCP SSE transport can be added later; HTTP tools are primary for Phase 1.",
    });
  });

  app.locals.cfg = cfg;
  return app;
}

export default createApp;
