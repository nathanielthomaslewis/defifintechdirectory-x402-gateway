/**
 * x402 challenge / verify / settle helpers.
 * STUB_MODE=1: accepts stub-ok (safe deploy without CDP keys).
 * STUB_MODE=0: POST facilitator /verify and /settle (CDP with JWT or PayAI).
 *
 * Prefer official @x402 middleware when USE_X402_MIDDLEWARE=1 and packages load
 * (see middleware.js). This module is the hardened fallback used by default routes.
 */

import { createHmac, createSign, generateKeyPairSync, createPrivateKey } from "node:crypto";
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

/**
 * Build Authorization header for CDP facilitator.
 * Uses ES256 JWT when CDP_API_KEY_ID + CDP_API_KEY_SECRET look like key material;
 * otherwise Bearer of raw secret (legacy) — prefer JWT via @coinbase/cdp-sdk in prod.
 */
async function facilitatorAuthHeaders(cfg) {
  if (!cfg.cdpApiKeyId || !cfg.cdpApiKeySecret) return {};

  // Prefer CDP SDK helper if available
  try {
    const cdp = await import("@coinbase/cdp-sdk/x402");
    if (typeof cdp.createCdpFacilitatorClient === "function") {
      // Client handles auth itself; we still need raw HTTP for fallback path.
    }
  } catch {
    /* optional */
  }

  // CDP API keys: secret is often a PEM EC private key (base64-wrapped) or a string.
  // Generate a short-lived JWT (HS256 fallback with hmac if secret is opaque).
  try {
    const token = await mintCdpJwt(cfg.cdpApiKeyId, cfg.cdpApiKeySecret);
    return { Authorization: `Bearer ${token}` };
  } catch (err) {
    console.warn("[x402] CDP JWT mint failed; requests may 401:", err?.message || err);
    return {};
  }
}

/**
 * Minimal CDP JWT (api key auth). Coinbase uses ES256 with the API key secret as EC key.
 * If secret is not PEM, fall back to HS256 for local wiring checks only.
 * See: https://docs.cdp.coinbase.com/get-started/docs/authentication
 */
async function mintCdpJwt(keyId, keySecret) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", typ: "JWT", kid: keyId, nonce: `${now}-${Math.random()}` };
  const payload = {
    sub: keyId,
    iss: "cdp",
    nbf: now,
    exp: now + 120,
    uris: ["POST /platform/v2/x402/verify", "POST /platform/v2/x402/settle"],
  };
  const enc = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${enc(header)}.${enc(payload)}`;

  const pem =
    keySecret.includes("BEGIN")
      ? keySecret
      : `-----BEGIN EC PRIVATE KEY-----\n${keySecret}\n-----END EC PRIVATE KEY-----`;

  try {
    const key = createPrivateKey(pem);
    const signer = createSign("SHA256");
    signer.update(signingInput);
    signer.end();
    const sig = signer.sign({ key, dsaEncoding: "ieee-p1363" });
    return `${signingInput}.${sig.toString("base64url")}`;
  } catch {
    // Opaque secret → HS256 (not valid for CDP prod; documents wiring)
    const sig = createHmac("sha256", keySecret).update(signingInput).digest("base64url");
    const hsHeader = enc({ alg: "HS256", typ: "JWT", kid: keyId });
    const hsPayload = enc(payload);
    return `${hsHeader}.${hsPayload}.${sig}`;
  }
}

async function postFacilitator(cfg, path, body) {
  const url = `${cfg.facilitatorUrl.replace(/\/$/, "")}${path}`;
  const headers = {
    "content-type": "application/json",
    ...(await facilitatorAuthHeaders(cfg)),
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
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

  if (
    cfg.facilitatorUrl.includes(CDP_FACILITATOR_URL.replace("https://", "")) ||
    cfg.facilitatorUrl.startsWith(CDP_FACILITATOR_URL)
  ) {
    if (!cfg.cdpApiKeyId || !cfg.cdpApiKeySecret) {
      return {
        isValid: false,
        invalidReason:
          "STUB_MODE=0 with CDP facilitator requires CDP_API_KEY_ID + CDP_API_KEY_SECRET",
      };
    }
  }

  const result = await postFacilitator(cfg, "/verify", {
    x402Version: X402_VERSION,
    paymentPayload: payload,
    paymentRequirements: requirements.accepts[0],
  });

  if (!result.ok) {
    return {
      isValid: false,
      invalidReason: result.error || result.invalidReason || "verify_failed",
      detail: result,
    };
  }
  return {
    isValid: result.isValid !== false,
    mode: "live",
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
      note: "No chain tx in STUB_MODE. Set STUB_MODE=0 + CDP keys (or PayAI) for real USDC.",
    };
  }

  const result = await postFacilitator(cfg, "/settle", {
    x402Version: X402_VERSION,
    paymentPayload: payload,
    paymentRequirements: requirements.accepts[0],
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "settle_failed",
      detail: result,
    };
  }
  return { success: true, mode: "live", ...result };
}
