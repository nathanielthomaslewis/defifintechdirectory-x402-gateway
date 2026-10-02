/**
 * x402 challenge / verify / settle helpers.
 * STUB_MODE=1: accepts stub-ok (safe deploy without CDP keys).
 * STUB_MODE=0: prefer createCdpFacilitatorClient; else HTTPFacilitatorClient / raw POST.
 */

import { TOOLS } from "./tools.js";
import { CDP_FACILITATOR_URL } from "./config.js";

const X402_VERSION = 2;

function usdToAtomicUsdc(priceUsd) {
  const n = Number(String(priceUsd).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) throw new Error(`bad price ${priceUsd}`);
  return String(Math.round(n * 1e6));
}

export function paymentRequiredForTool(toolId, cfg) {
  const tool = TOOLS[toolId];
  if (!tool) return null;
  const amount = usdToAtomicUsdc(tool.priceUsd);
  return {
    x402Version: X402_VERSION,
    error: "PAYMENT_REQUIRED",
    resource: {
      url: `https://api.defifintechdirectory.com/tools/${toolId}`,
      description: tool.description,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: cfg.network,
        amount,
        asset: cfg.usdcAsset,
        payTo: cfg.payTo,
        maxTimeoutSeconds: 60,
        extra: {
          name: "USDC",
          version: "2",
          listPrice: tool.priceUsd,
          listed: cfg.listed,
        },
      },
    ],
  };
}

export function encodePaymentRequired(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

export function decodePaymentSignature(headerVal) {
  if (!headerVal) return null;
  if (headerVal === "stub-ok") return { stub: true, x402Version: X402_VERSION };
  try {
    const json = Buffer.from(headerVal, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return { raw: headerVal };
  }
}

export function encodePaymentResponse(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

/** Lazy CDP facilitator client (authenticated). */
let _cdpClientPromise = null;
async function getCdpFacilitatorClient(cfg) {
  if (!cfg.cdpApiKeyId || !cfg.cdpApiKeySecret) return null;
  if (_cdpClientPromise) return _cdpClientPromise;
  _cdpClientPromise = (async () => {
    const { createCdpFacilitatorClient } = await import("@coinbase/cdp-sdk/x402");
    return createCdpFacilitatorClient({
      apiKeyId: cfg.cdpApiKeyId,
      apiKeySecret: cfg.cdpApiKeySecret,
    });
  })().catch((err) => {
    _cdpClientPromise = null;
    console.warn("[x402] createCdpFacilitatorClient failed:", err?.message || err);
    return null;
  });
  return _cdpClientPromise;
}

async function postFacilitatorRaw(cfg, path, body) {
  const url = `${cfg.facilitatorUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      ...json,
      error: json?.error || `facilitator HTTP ${res.status}`,
    };
  }
  return { ok: true, ...json };
}

export async function verifyPayment({ payload, requirements, cfg }) {
  if (cfg.stubMode) {
    if (payload?.stub === true || payload === "stub-ok") {
      return { isValid: true, mode: "stub" };
    }
    if (payload && Object.keys(payload).length) {
      return { isValid: true, mode: "stub-lenient" };
    }
    return {
      isValid: false,
      invalidReason: "missing PAYMENT-SIGNATURE (use stub-ok while STUB_MODE=1)",
    };
  }

  if (!payload) {
    return { isValid: false, invalidReason: "missing payment payload" };
  }

  const body = {
    x402Version: X402_VERSION,
    paymentPayload: payload,
    paymentRequirements: requirements.accepts[0],
  };

  // Prefer authenticated CDP SDK client
  const cdpClient = await getCdpFacilitatorClient(cfg);
  if (cdpClient?.verify) {
    try {
      const result = await cdpClient.verify(body);
      return {
        isValid: result?.isValid !== false,
        mode: "cdp-sdk",
        ...result,
      };
    } catch (err) {
      return {
        isValid: false,
        invalidReason: String(err?.message || err).slice(0, 200),
        mode: "cdp-sdk-error",
      };
    }
  }

  if (
    cfg.facilitatorUrl.startsWith(CDP_FACILITATOR_URL) &&
    (!cfg.cdpApiKeyId || !cfg.cdpApiKeySecret)
  ) {
    return {
      isValid: false,
      invalidReason:
        "STUB_MODE=0 with CDP facilitator requires CDP_API_KEY_ID + CDP_API_KEY_SECRET",
    };
  }

  const result = await postFacilitatorRaw(cfg, "/verify", body);
  if (!result.ok) {
    return {
      isValid: false,
      invalidReason: result.error || result.invalidReason || "verify_failed",
      detail: { status: result.status },
    };
  }
  return {
    isValid: result.isValid !== false,
    mode: "live-http",
    ...result,
  };
}

export async function settlePayment({ payload, requirements, cfg }) {
  if (cfg.stubMode) {
    return {
      success: true,
      mode: "stub",
      transaction: "0xSTUB_SETTLEMENT_NOT_ONCHAIN",
      network: cfg.network,
      payer: "stub",
      note: "No chain tx in STUB_MODE. Set STUB_MODE=0 + CDP keys for real USDC.",
    };
  }

  const body = {
    x402Version: X402_VERSION,
    paymentPayload: payload,
    paymentRequirements: requirements.accepts[0],
  };

  const cdpClient = await getCdpFacilitatorClient(cfg);
  if (cdpClient?.settle) {
    try {
      const result = await cdpClient.settle(body);
      return { success: result?.success !== false, mode: "cdp-sdk", ...result };
    } catch (err) {
      return {
        success: false,
        error: String(err?.message || err).slice(0, 200),
        mode: "cdp-sdk-error",
      };
    }
  }

  const result = await postFacilitatorRaw(cfg, "/settle", body);
  if (!result.ok) {
    return {
      success: false,
      error: result.error || "settle_failed",
      detail: { status: result.status },
    };
  }
  return { success: true, mode: "live-http", ...result };
}
