# How to pay with x402

Payments are **live**. This documents the flow the gateway runs today.

## Steps

1. Request a tool (`POST https://api.defifintechdirectory.com/tools/{id}` or MCP `tools/call`).
2. Server returns **Payment Required** (HTTP 402 / MCP error) with price, Base, USDC, `payTo`.
3. Wallet signs USDC authorization (EIP-3009; facilitator typically pays gas).
4. Retry with proof: `PAYMENT-SIGNATURE` or `_meta["x402/payment"]`.
5. Server verifies → runs tool → settles on Base → returns result + receipt.
6. No account, no Stripe, no API key for buyers.

## Network

- Network: `eip155:8453` (Base)
- Asset: USDC · Scheme: `exact`
- payTo: `0x96873Fb532C630aE88c5e8A5dF5ef430c92dfF32`
- HTTP: https://api.defifintechdirectory.com
- MCP: https://api.defifintechdirectory.com/mcp

## Refs

- https://docs.x402.org/getting-started/quickstart-for-sellers.md
- https://docs.x402.org/guides/mcp-server-with-x402
