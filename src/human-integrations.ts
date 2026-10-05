export interface AuthenticatedIdentity { userId: string; sessionId: string; expiresAt: number }
export interface HumanAuthProvider {
  resolveSession(opaqueCookie: string): Promise<AuthenticatedIdentity | null>;
  revokeSession(sessionId: string): Promise<void>;
}
export interface DurableCreditStore {
  readonly distributed: true;
  reserve(userId: string, jobId: string, quoteId: string, credits: number): Promise<void>;
  capture(userId: string, jobId: string): Promise<void>;
  release(userId: string, jobId: string): Promise<void>;
  applyVerifiedPurchase(event: VerifiedTestPurchase): Promise<'applied' | 'duplicate'>;
}
export interface VerifiedTestPurchase {
  provider: 'stripe'; mode: 'test'; eventId: string; paymentIntentId: string; checkoutSessionId: string;
  userId: string; credits: number; amountMinor: number; currency: string;
}
export interface PrivateArtifactStore {
  put(userId: string, jobId: string, bytes: Uint8Array, contentType: string): Promise<{ artifactId: string }>;
  signedReadForOwner(userId: string, artifactId: string, ttlSeconds: number): Promise<string>;
  deleteForOwner(userId: string, artifactId: string): Promise<void>;
}
export interface StripeTestCheckout {
  readonly mode: 'test';
  create(userId: string, packageId: string, idempotencyKey: string): Promise<{ checkoutSessionId: string; redirectUrl: string }>;
  verifyRawWebhook(rawBody: Uint8Array, signature: string): Promise<VerifiedTestPurchase>;
}

export function humanIntegrationStatus() {
  return {
    demo: true, authConfigured: false, checkoutEnabled: false, storageConfigured: false, livePaymentsEnabled: false,
    mode: 'local-preview',
    blockers: ['Real authentication and tenant database are not connected.', 'Distributed transactional credit storage and private artifact storage are not connected.', 'Stripe test checkout and a verified webhook endpoint are not connected.'],
  };
}
