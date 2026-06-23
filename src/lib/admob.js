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

function showCountdownOverlay(seconds) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'admob-countdown-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:sans-serif;';
    const msg = document.createElement('p');
    msg.style.cssText = 'font-size:18px;margin-bottom:12px;opacity:0.85;';
    msg.textContent = 'Ad loading in…';
    const counter = document.createElement('div');
    counter.style.cssText = 'font-size:52px;font-weight:700;line-height:1;';
    counter.textContent = String(seconds);
    overlay.appendChild(msg);
    overlay.appendChild(counter);
    document.body.appendChild(overlay);
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining -= 1;
      counter.textContent = String(remaining);
      if (remaining <= 0) { clearInterval(interval); resolve(); }
    }, 1000);
  });
}

function removeCountdownOverlay() {
  const el = document.getElementById('admob-countdown-overlay');
  if (el) el.remove();
}

export async function showInterstitialAd() {
  if (!isNative() || !getAdMob()) return false;
  if (isUserActive()) return false;
  try {
    await showCountdownOverlay(5);
    await getAdMob().prepareInterstitial({ adId: AD_UNIT_ID, isTesting: false });
    await getAdMob().showInterstitial();
    return true;
  } catch (e) {
    console.error('[AdMob] interstitial failed:', e);
    removeCountdownOverlay();
    return false;
  }
}

export async function maybeShowAdOnOpen() {
  const count = parseInt(localStorage.getItem(OPEN_COUNT_KEY) || '0') + 1;
  localStorage.setItem(OPEN_COUNT_KEY, String(count));
  if (count % SHOW_EVERY_N_OPENS === 0) {
    await new Promise(resolve => setTimeout(resolve, AD_DELAY_MS));
    await showInterstitialAd();
  }
}