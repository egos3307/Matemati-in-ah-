import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA, trackPageView, trackEvent, getButtonText, getButtonLocation } from '../utils/analytics';

const REGISTRATION_KEYWORDS = [
  'kayıt',
  'kaydol',
  'ücretsiz ders',
  'ücretsiz tanışma',
  'tanışma dersi',
  'ders talebi',
  'hemen başla',
  'iletişime geç',
  'yer ayırt',
  'ücretsiz ilk ders',
  'başvur',
  'hemen katıl'
];

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      trackPageView(location.pathname + location.search, document.title);
    }, 100);
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const handleGlobalClick = (event) => {
      const target = event.target;
      if (!target) return;

      const clickable = target.closest('a, button, [role="button"], input[type="submit"]');
      if (!clickable) return;

      const href = (clickable.getAttribute('href') || '').toLowerCase();
      const text = getButtonText(clickable);
      const textLower = text.toLowerCase();
      const locationName = getButtonLocation(clickable);

      if (
        href.includes('wa.me') ||
        href.includes('whatsapp.com') ||
        href.includes('api.whatsapp.com') ||
        href.startsWith('whatsapp:') ||
        textLower.includes('whatsapp')
      ) {
        trackEvent('whatsapp_click', {
          button_text: text || 'WhatsApp',
          button_location: locationName
        });
        return;
      }

      if (href.startsWith('tel:')) {
        trackEvent('phone_click', {
          button_text: text || href.replace('tel:', ''),
          button_location: locationName
        });
        return;
      }

      const isRegistrationClick = REGISTRATION_KEYWORDS.some(keyword => textLower.includes(keyword));
      if (isRegistrationClick) {
        trackEvent('registration_click', {
          button_text: text,
          button_location: locationName
        });
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  return null;
};

export default AnalyticsTracker;
