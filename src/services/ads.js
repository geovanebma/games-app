export const AD_PLACEMENTS = {
  BEFORE_REVEAL: 'before_reveal',
  ROUND_END: 'round_end',
  PLAY_AGAIN: 'play_again',
  REWARDED_UNLOCK: 'rewarded_unlock',
};

export const ADS_CONFIG = {
  enabled: true,
  minSecondsBetweenInterstitials: 70,
  firstRevealAdDelayCount: 1,
  placements: {
    [AD_PLACEMENTS.BEFORE_REVEAL]: {
      enabled: true,
      kind: 'interstitial',
      every: 1,
    },
    [AD_PLACEMENTS.ROUND_END]: {
      enabled: true,
      kind: 'interstitial',
      every: 1,
    },
    [AD_PLACEMENTS.PLAY_AGAIN]: {
      enabled: true,
      kind: 'interstitial',
      every: 1,
    },
    [AD_PLACEMENTS.REWARDED_UNLOCK]: {
      enabled: true,
      kind: 'rewarded',
      every: 1,
    },
  },
};

export function shouldShowAd({ placement, runtime, isPremium = false, now = Date.now() }) {
  if (!ADS_CONFIG.enabled || isPremium) return false;
  const placementConfig = ADS_CONFIG.placements[placement];
  if (!placementConfig?.enabled) return false;

  const impressions = Number(runtime.impressionsByPlacement?.[placement] ?? 0);
  const attempts = Number(runtime.attemptsByPlacement?.[placement] ?? 0) + 1;
  if (attempts % placementConfig.every !== 0) return false;

  if (placement !== AD_PLACEMENTS.REWARDED_UNLOCK) {
    const lastShownAt = Number(runtime.lastInterstitialAt ?? 0);
    const elapsedSeconds = (now - lastShownAt) / 1000;
    if (impressions > 0 && elapsedSeconds < ADS_CONFIG.minSecondsBetweenInterstitials) return false;
  }

  return true;
}

export async function showAd({ placement }) {
  // Wire the real SDK here later (AdMob/AppLovin/etc).
  // Expected return: true when an ad actually opened and closed, false otherwise.
  if (placement === AD_PLACEMENTS.REWARDED_UNLOCK) return false;
  return false;
}

export function registerAdAttempt(runtime, placement) {
  return {
    ...runtime,
    attemptsByPlacement: {
      ...(runtime.attemptsByPlacement ?? {}),
      [placement]: Number(runtime.attemptsByPlacement?.[placement] ?? 0) + 1,
    },
  };
}

export function registerAdImpression(runtime, placement, now = Date.now()) {
  const placementConfig = ADS_CONFIG.placements[placement];
  return {
    ...runtime,
    lastInterstitialAt: placementConfig?.kind === 'interstitial' ? now : runtime.lastInterstitialAt,
    impressionsByPlacement: {
      ...(runtime.impressionsByPlacement ?? {}),
      [placement]: Number(runtime.impressionsByPlacement?.[placement] ?? 0) + 1,
    },
  };
}
