/**
 * UTM Parameter Utility
 * Captures, stores, and appends UTM parameters across the conversion funnel.
 */

export const captureUtmParams = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const storedUtm = JSON.parse(sessionStorage.getItem('fulle_utm_params') || '{}');
    let updated = false;

    utmKeys.forEach(key => {
      const val = urlParams.get(key);
      if (val) {
        storedUtm[key] = val;
        updated = true;
      }
    });

    if (updated) {
      sessionStorage.setItem('fulle_utm_params', JSON.stringify(storedUtm));
    }
  } catch (err) {
    console.warn('[UTM Capture Error]', err);
  }
};

export const getUtmParams = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem('fulle_utm_params') || '{}');
  } catch {
    return {};
  }
};

export const appendUtmToUrl = (urlStr) => {
  const utm = getUtmParams();
  if (!utm || Object.keys(utm).length === 0 || !urlStr) return urlStr;
  
  try {
    const dummyBase = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://example.com';
    const urlObj = new URL(isRelative ? dummyBase + urlStr : urlStr);
    
    Object.keys(utm).forEach(key => {
      if (utm[key] && !urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, utm[key]);
      }
    });

    if (isRelative) {
      return urlObj.pathname + urlObj.search + urlObj.hash;
    }
    return urlObj.toString();
  } catch {
    return urlStr;
  }
};
