import React from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';
import { appendUtmToUrl } from '../utils/utm';

const REAL_TRUST_ELEMENTS = [
  { icon: 'videocam', label: '%100 Canlı & İnteraktif Dersler' },
  { icon: 'analytics', label: 'Birebir Seviye ve Gelişim Takibi' },
  { icon: 'ondemand_video', label: '7/24 Sınırsız Ders Kaydı Erişimi' },
  { icon: 'support_agent', label: 'Öğretmen İletişim & Ödev Desteği' }
];

const BlogEndConversion = ({ post }) => {
  const categoryParam = post?.category?.includes('LGS') ? 'LGS 2027' : post?.category?.includes('KPSS') ? 'KPSS 2027' : 'YKS 2027';
  const primaryTargetUrl = appendUtmToUrl(`/ucretsiz-tanisma-dersi?kategori=${encodeURIComponent(categoryParam)}&ref=blog_end`);
  const secondaryTargetUrl = appendUtmToUrl('/derslerimiz?ref=blog_end');

  const handlePrimaryCta = () => {
    trackEvent('blog_cta_click', {
      blog_slug: post?.slug,
      blog_category: post?.category,
      cta_position: 'end_conversion',
      button_text: 'Ücretsiz Dersimi Planla'
    });
    trackEvent('free_lesson_click', {
      blog_slug: post?.slug,
      source: 'blog_end_conversion'
    });
  };

  const handleSecondaryCta = () => {
    trackEvent('product_cta_click', {
      blog_slug: post?.slug,
      product: 'Matematik Paketleri',
      button_location: 'blog_end_conversion'
    });
  };

  return (
    <section className="my-12 rounded-3xl border border-primary/20 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
      {/* Decorative subtle ambient circle */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-indigo-200 border border-white/10">
          <span className="material-symbols-outlined text-sm">workspace_premium</span>
          <span>Matematiğin Şahı Özel Öğretim Sistemi</span>
        </div>

        <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-snug">
          Buraya kadar geldiysen matematiğini geliştirme konusunda ciddisin.
        </h3>

        <p className="text-sm md:text-base text-indigo-100/90 leading-relaxed max-w-2xl mx-auto">
          İlk canlı dersini ücretsiz dene. Seviyeni görelim ve sana nereden başlaman gerektiğini gösterelim.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to={primaryTargetUrl}
            onClick={handlePrimaryCta}
            className="w-full sm:w-auto inline-flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 text-sm font-black text-white shadow-lg shadow-primary/40 hover:bg-primary/90 hover:scale-102 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            <span>Ücretsiz Dersimi Planla</span>
          </Link>

          <Link
            to={secondaryTargetUrl}
            onClick={handleSecondaryCta}
            className="w-full sm:w-auto inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 backdrop-blur-xs px-7 text-sm font-bold text-white hover:bg-white/15 transition-all cursor-pointer"
          >
            <span>Matematik Paketlerini İncele</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>

        {/* Real Trust Elements */}
        <div className="pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          {REAL_TRUST_ELEMENTS.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 bg-white/5 rounded-xl p-3 border border-white/5">
              <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                {item.icon}
              </span>
              <span className="text-2xs md:text-xs font-semibold text-slate-200 leading-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogEndConversion;
