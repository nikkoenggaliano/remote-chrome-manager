'use strict';

/*
 * Device profiles for the control view's Web / Mobile switch.
 *
 * Only three things actually decide whether a site serves you its mobile
 * build: the viewport size, the user agent (plus its Client Hints twin, which
 * modern Chrome sends instead of the UA string on many sites), and whether
 * touch exists. All three are set together, because a site that sees a phone
 * viewport but a desktop UA will happily serve the desktop build at 390px and
 * the preview is then worse than useless.
 *
 * deviceScaleFactor is deliberately NOT part of a preset. A real iPhone 14 is
 * 3x, but every captured frame is JPEG-compressed and then scaled down into a
 * panel a few hundred pixels wide, so 3x only buys nine times the pixels for
 * Chrome to read back and the network to carry. Callers that want the real
 * ratio can pass device_scale_factor explicitly.
 */

// Android presets borrow the fleet browser's own Chrome version so the UA
// string and the Client Hints brand list agree with each other; a mismatch is
// itself a fingerprint. Falls back to a pinned version when the browser's UA
// cannot be read.
const FALLBACK_CHROME_VERSION = '140.0.0.0';

const PRESETS = [
  {
    id: 'iphone-14-pro',
    label: 'iPhone 14 Pro',
    platform: 'ios',
    width: 393,
    height: 852,
    mobile: true,
    touch: true,
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    client_hints: { platform: 'iOS', platformVersion: '17.5', model: 'iPhone', mobile: true, brands: [] },
  },
  {
    id: 'iphone-se',
    label: 'iPhone SE',
    platform: 'ios',
    width: 375,
    height: 667,
    mobile: true,
    touch: true,
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    client_hints: { platform: 'iOS', platformVersion: '17.5', model: 'iPhone', mobile: true, brands: [] },
  },
  {
    id: 'pixel-7',
    label: 'Pixel 7',
    platform: 'android',
    width: 412,
    height: 915,
    mobile: true,
    touch: true,
    user_agent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Mobile Safari/537.36',
    client_hints: { platform: 'Android', platformVersion: '13', model: 'Pixel 7', mobile: true },
  },
  {
    id: 'galaxy-s21',
    label: 'Galaxy S21',
    platform: 'android',
    width: 360,
    height: 800,
    mobile: true,
    touch: true,
    user_agent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Mobile Safari/537.36',
    client_hints: { platform: 'Android', platformVersion: '13', model: 'SM-G991B', mobile: true },
  },
  {
    id: 'ipad-mini',
    label: 'iPad Mini',
    platform: 'ios',
    width: 768,
    height: 1024,
    // A tablet reports itself as mobile and has touch, but gets the desktop
    // layout breakpoints, which is exactly what makes it worth previewing.
    mobile: true,
    touch: true,
    user_agent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    client_hints: { platform: 'iOS', platformVersion: '17.5', model: 'iPad', mobile: true, brands: [] },
  },
];

const DEFAULT_PRESET_ID = 'iphone-14-pro';

function listPresets() {
  return PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    width: preset.width,
    height: preset.height,
    mobile: preset.mobile,
    touch: preset.touch,
  }));
}

function findPreset(id) {
  if (!id) return null;
  const wanted = String(id).trim().toLowerCase();
  return PRESETS.find((preset) => preset.id === wanted) || null;
}

function chromeVersionFrom(userAgent) {
  const match = /(?:Chrome|HeadlessChrome)\/(\d+\.\d+\.\d+\.\d+)/.exec(String(userAgent || ''));
  return match ? match[1] : FALLBACK_CHROME_VERSION;
}

// Resolve a preset into the exact overrides CDP wants, given the user agent the
// instance's own browser reports.
function resolvePreset(preset, browserUserAgent) {
  const version = chromeVersionFrom(browserUserAgent);
  const major = version.split('.')[0];
  const userAgent = preset.user_agent.replace('{version}', version);

  const hints = { ...preset.client_hints, architecture: '', fullVersion: version };
  if (!Array.isArray(hints.brands)) {
    hints.brands = [
      { brand: 'Chromium', version: major },
      { brand: 'Google Chrome', version: major },
      { brand: 'Not=A?Brand', version: '24' },
    ];
  }

  return {
    preset_id: preset.id,
    label: preset.label,
    width: preset.width,
    height: preset.height,
    mobile: preset.mobile,
    touch: preset.touch,
    user_agent: userAgent,
    client_hints: hints,
  };
}

module.exports = {
  PRESETS,
  DEFAULT_PRESET_ID,
  listPresets,
  findPreset,
  resolvePreset,
  chromeVersionFrom,
};
