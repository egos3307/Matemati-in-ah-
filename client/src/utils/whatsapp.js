/**
 * Dynamic WhatsApp Link Generator
 * Prepares context-aware WhatsApp messages based on the current blog topic/category.
 */

import { appendUtmToUrl } from './utm';

export const getDynamicWhatsAppLink = (postOrCategory, customMessage) => {
  const phoneNumber = import.meta.env.VITE_WHATSAPP_PHONE || '905350598950';
  let message = 'Merhaba, dersler hakkında bilgi almak istiyorum.';

  if (customMessage) {
    message = customMessage;
  } else if (postOrCategory) {
    const textToAnalyze = (typeof postOrCategory === 'string' 
      ? postOrCategory 
      : `${postOrCategory.title || ''} ${postOrCategory.category || ''} ${postOrCategory.slug || ''}`
    ).toLowerCase();

    if (textToAnalyze.includes('tyt') || textToAnalyze.includes('temel kavramlar') || textToAnalyze.includes('problemler')) {
      message = 'Merhaba, TYT Matematik hakkında bilgi almak istiyorum.';
    } else if (textToAnalyze.includes('lgs') || textToAnalyze.includes('8. sınıf') || textToAnalyze.includes('ortaokul')) {
      message = 'Merhaba, LGS Matematik dersleri hakkında bilgi almak istiyorum.';
    } else if (textToAnalyze.includes('ayt') || textToAnalyze.includes('türev') || textToAnalyze.includes('integral') || textToAnalyze.includes('trigonometri')) {
      message = 'Merhaba, AYT Matematik dersleri hakkında bilgi almak istiyorum.';
    } else if (textToAnalyze.includes('kpss') || textToAnalyze.includes('ön lisans') || textToAnalyze.includes('lisans')) {
      message = 'Merhaba, KPSS Matematik dersleri hakkında bilgi almak istiyorum.';
    } else if (textToAnalyze.includes('9.') || textToAnalyze.includes('10.') || textToAnalyze.includes('11.') || textToAnalyze.includes('12.')) {
      message = 'Merhaba, okul sınavları ve canlı matematik dersleri hakkında bilgi almak istiyorum.';
    }
  }

  const encodedMessage = encodeURIComponent(message);
  const baseUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  return appendUtmToUrl(baseUrl);
};
