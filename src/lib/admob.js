const AD_UNIT_ID = 'ca-app-pub-7979856440890193/3645479960';
const SHOW_EVERY_N_OPENS = 3;
const OPEN_COUNT_KEY = 'admgr_open_count';
const AD_DELAY_MS = 30000;

function isNative() {
  return window.Capacitor?.isNativePlatform?.() === true;
}

function getAdMob() {
  return window.Capacitor?.Plugins?.AdMob;
}

export async function initAdMob() {
  if (!isNative() || !getAdMob()) return;
  try {
    await getAdMob().initialize({ initializeForTesting: false });
    console.log('[AdMob] initialized');
  } catch (e) {
    console.error('[AdMob] initialize failed:', e);
  }
}

function isUserActive() {
  const activeEl = document.activeElement;
  if (activeEl) {
    const tag = activeEl.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || activeEl.isContentEditable) return true;
  }
  return false;
}

export async function showInterstitialAd() {
  if (!isNative() || !getAdMob()) return false;
  if (isUserActive()) return false;
  try {
    await getAdMob().prepareInterstitial({ adId: AD_UNIT_ID, isTesting: false });
    await getAdMob().showInterstitial();
    return true;
  } catch (e) {
    console.error('[AdMob] interstitial failed:', e);
    return false;
  }
}

export async function maybeShowAdOnOpen() {
  // Never show an ad on the very first open, or if onboarding hasn't been completed yet
  const count = parseInt(localStorage.getItem(OPEN_COUNT_KEY) || '0') + 1;
  localStorage.setItem(OPEN_COUNT_KEY, String(count));
  if (count <= 1) return; // skip first-ever open
  try {
    const { base44 } = await import('@/api/base44Client');
    const profiles = await base44.entities.UserProfile.filter({});
    if (!profiles[0]?.onboarding_completed) return; // skip if onboarding not done
  } catch (e) { return; }
  if (count % SHOW_EVERY_N_OPENS === 0) {
    await new Promise(resolve => setTimeout(resolve, AD_DELAY_MS));
    await showInterstitialAd();
  }
}