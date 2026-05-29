export const PREMIUM_PRODUCT_ID = 'premium_lifetime';

export const PREMIUM_ENTITLEMENT = {
  FREE: 'free',
  LIFETIME: 'lifetime',
};

export function createFreeEntitlement() {
  return {
    status: PREMIUM_ENTITLEMENT.FREE,
    active: false,
    productId: null,
    purchaseToken: null,
    source: 'local',
    restoredAt: null,
    purchasedAt: null,
  };
}

export async function purchaseLifetimePremium() {
  // Wire Google Play Billing here later.
  // Expected real behavior:
  // 1. launch BillingClient purchase flow for PREMIUM_PRODUCT_ID
  // 2. acknowledge the purchase
  // 3. verify ownership
  // 4. return active lifetime entitlement
  return {
    ok: false,
    reason: 'billing_not_connected',
    entitlement: createFreeEntitlement(),
  };
}

export async function restoreLifetimePremium() {
  // Wire Google Play Billing queryPurchasesAsync here later.
  // The Play Store account owns non-consumable products. If the user reinstalls
  // the app with the same Google Play account, this function should find
  // PREMIUM_PRODUCT_ID and return active=true without charging again.
  return {
    ok: false,
    reason: 'billing_not_connected',
    entitlement: createFreeEntitlement(),
  };
}

export function isPremiumEntitlement(entitlement) {
  return Boolean(entitlement?.active && entitlement?.status === PREMIUM_ENTITLEMENT.LIFETIME);
}
