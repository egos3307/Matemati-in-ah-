const GA_MEASUREMENT_ID = 'G-KKXST6EHJ3';

let isGAInitialized = false;
let lastEventCache = { key: '', timestamp: 0 };

export const isDevEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
};

export const initGA = () => {
  if (typeof window === 'undefined') return;

  if (isGAInitialized || window.gtag || document.getElementById('ga-gtag-script')) {
    isGAInitialized = true;
    return;
  }

  const script = document.createElement('script');
  script.id = 'ga-gtag-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false
  });

  isGAInitialized = true;
};

export const getButtonLocation = (element) => {
  if (!element) return 'unknown';
  const closestContainer = element.closest(
    'header, footer, nav, form, main, section, [id], [class*="hero"], [class*="banner"], [class*="modal"]'
  );
  if (!closestContainer) return 'page_body';

  if (closestContainer.tagName) {
    const tag = closestContainer.tagName.toLowerCase();
    if (['header', 'footer', 'nav', 'form', 'main'].includes(tag)) {
      return tag;
    }
  }

  if (closestContainer.id) {
    return closestContainer.id;
  }

  if (closestContainer.className && typeof closestContainer.className === 'string') {
    const matchedClass = closestContainer.className
      .split(' ')
      .find(c => c.includes('hero') || c.includes('banner') || c.includes('modal') || c.includes('card'));
    if (matchedClass) return matchedClass;
  }

  return 'page_section';
};

export const getButtonText = (element) => {
  if (!element) return '';
  const text = element.innerText || element.textContent || element.title || element.getAttribute('aria-label') || element.value || '';
  return text.trim().replace(/\s+/g, ' ').slice(0, 100);
};

// Send conversion log to local server (non-blocking)
const logBackendConversion = (eventName, params) => {
  if (typeof window === 'undefined') return;
  try {
    const utmParams = JSON.parse(sessionStorage.getItem('fulle_utm_params') || '{}');
    fetch('/api/analytics/log-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: eventName,
        blogSlug: params.blog_slug || (window.location.pathname.startsWith('/blog/') ? window.location.pathname.replace('/blog/', '') : null),
        blogCategory: params.blog_category || null,
        ctaPosition: params.cta_position || params.button_location || null,
        productName: params.product || null,
        source: utmParams.utm_source || document.referrer || 'direct',
        utmCampaign: utmParams.utm_campaign || null
      })
    }).catch(() => {});
  } catch {
    // Ignore fetch errors
  }
};

export const trackEvent = (eventName, params = {}) => {
  if (typeof window === 'undefined') return;

  const eventKey = `${eventName}_${params.button_text || ''}_${params.button_location || ''}_${window.location.pathname}`;
  const now = Date.now();
  if (lastEventCache.key === eventKey && now - lastEventCache.timestamp < 300) {
    return;
  }
  lastEventCache = { key: eventKey, timestamp: now };

  const enrichedParams = {
    page_location: window.location.href,
    page_title: document.title,
    ...params
  };

  const urlParams = new URLSearchParams(window.location.search);
  const isDebugRequested = urlParams.get('debug_ga') === 'true' || urlParams.get('debug_mode') === 'true';

  if (isDevEnvironment() && !isDebugRequested) {
    console.log('[GA4 Dev Event]', eventName, enrichedParams);
  }

  if (isDebugRequested) {
    enrichedParams.debug_mode = true;
  }

  if (window.gtag) {
    window.gtag('event', eventName, enrichedParams);
  } else {
    initGA();
    if (window.gtag) {
      window.gtag('event', eventName, enrichedParams);
    }
  }

  // Also record conversion in backend for dashboard report
  logBackendConversion(eventName, enrichedParams);
};

export const trackPageView = (path, title) => {
  if (typeof window === 'undefined') return;

  const pagePath = path || window.location.pathname + window.location.search;
  const pageTitle = title || document.title;
  const eventKey = `page_view_${pagePath}`;
  const now = Date.now();

  if (lastEventCache.key === eventKey && now - lastEventCache.timestamp < 300) {
    return;
  }
  lastEventCache = { key: eventKey, timestamp: now };

  const params = {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: window.location.href
  };

  const urlParams = new URLSearchParams(window.location.search);
  const isDebugRequested = urlParams.get('debug_ga') === 'true' || urlParams.get('debug_mode') === 'true';

  if (isDevEnvironment() && !isDebugRequested) {
    console.log('[GA4 Dev PageView]', pagePath, params);
  }

  if (isDebugRequested) {
    params.debug_mode = true;
  }

  if (window.gtag) {
    window.gtag('event', 'page_view', params);
  } else {
    initGA();
    if (window.gtag) {
      window.gtag('event', 'page_view', params);
    }
  }

  if (pagePath.startsWith('/blog/')) {
    logBackendConversion('blog_cta_view', { blog_slug: pagePath.replace('/blog/', '').split('?')[0] });
  }
};
