export function tryAttachX402Middleware() {
  throw new Error('Separate payment middleware is disabled; use the shared execution pipeline.');
}

export function tryCreateCdpX402Server() {
  throw new Error('Separate CDP payment server is disabled; inject a facilitator client into the shared pipeline.');
}
