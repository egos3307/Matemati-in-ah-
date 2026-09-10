import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';
import { appendUtmToUrl } from '../utils/utm';

const getCtaContent = (post) => {
  const textToAnalyze = `${post?.title || ''} ${post?.category || ''} ${post?.slug || ''} ${post?.excerpt || ''}`.toLowerCase();

  if (textToAnalyze.includes('tyt') || textToAnalyze.includes('temel kavramlar') || textToAnalyze.includes('problemler')) {
    return {
      category: 'TYT',
      targetQuotaCategory: 'YKS 2027',
      badge: 'TYT Matematik Özel Destek',
      title: 'TYT Matematikte netlerini yükseltmek ister misin?',
      subtitle: 'İlk canlı ders ücretsiz. Seviyeni belirleyelim ve sana uygun çalışma planını oluşturalım.',
      buttonText: 'Ücretsiz Dersimi Planla',
      icon: 'military_tech'
    };
  }

  if (textToAnalyze.includes('lgs') || textToAnalyze.includes('8. sınıf') || textToAnalyze.includes('ortaokul')) {
    return {
      category: 'LGS',
      targetQuotaCategory: 'LGS 2027',
      badge: 'LGS 2027 Matematik Kampı',
      title: 'LGS Matematikte zorlandığın konuları birlikte kapatalım.',
      subtitle: 'İlk canlı tanışma dersine katıl, eksiklerini belirleyelim ve LGS hedef derece planını oluşturalım.',
      buttonText: 'Ücretsiz Tanışma Dersine Katıl',
      icon: 'school'
    };
  }

  if (textToAnalyze.includes('ayt') || textToAnalyze.includes('türev') || textToAnalyze.includes('integral') || textToAnalyze.includes('trigonometri')) {
    return {
      category: 'AYT',
      targetQuotaCategory: 'YKS 2027',
      badge: 'AYT Matematik Derece Paketleri',
      title: 'AYT Matematik netlerini yükseltmeye başla.',
      subtitle: 'Zorlu AYT konularında pratik soru çözümleri ve canlı birebir takip ile başarıya ulaş.',
      buttonText: 'Ücretsiz Dersimi Planla',
      icon: 'psychology'
    };
  }

  if (textToAnalyze.includes('kpss') || textToAnalyze.includes('lisans') || textToAnalyze.includes('ön lisans')) {
    return {
      category: 'KPSS',
      targetQuotaCategory: 'KPSS 2027',
      badge: 'KPSS Matematik Kadro Garantisi',
      title: 'KPSS Matematikte eksiklerini kapatıp hedefine ulaş.',
      subtitle: 'Detaylı konu anlatımları ve çıkmış soruların pratik yöntemleriyle matematiği güvenceye al.',
      buttonText: 'Ücretsiz Tanışma Dersine Katıl',
      icon: 'workspace_premium'
    };
  }

  // Check grade specific
  const gradeMatch = textToAnalyze.match(/(\d+)\.\s*sınıf/);
  if (gradeMatch) {
    const gradeNum = gradeMatch[1];
    return {
      category: `${gradeNum}. Sınıf`,
      targetQuotaCategory: 'MAARIF',
      badge: `${gradeNum}. Sınıf Maarif Modeli Matematik`,
      title: `${gradeNum}. Sınıf Matematikte okul yazılılarını ve netlerini zirveye taşı.`,
      subtitle: 'Sınıf seviyene tam uygun canlı interaktif dersler ve kişiye özel takip ile hedefine başla.',
      buttonText: 'Ücretsiz Dersimi Planla',
      icon: 'auto_stories'
    };
  }

  return {
    category: 'Genel',
    targetQuotaCategory: 'YKS 2027',
    badge: 'Canlı Birebir Canlı Matematik',
    title: 'Matematik başarın için ilk adımı bugün at!',
    subtitle: 'Uzman kadromuzla ücretsiz canlı tanışma dersinde seviyeni görelim ve sana en uygun programı hazırlayalım.',
    buttonText: 'Ücretsiz Dersimi Planla',
    icon: 'rocket_launch'
  };
};

const BlogDynamicCta = ({ post, position = 'mid_content' }) => {
  const cta = getCtaContent(post);

  useEffect(() => {
    trackEvent('blog_cta_view', {
      blog_slug: post?.slug,
      blog_category: post?.category,
      cta_position: position,
      cta_category: cta.category
    });
  }, [post?.slug, position, cta.category]);

  const handleCtaClick = () => {
    trackEvent('blog_cta_click', {
      blog_slug: post?.slug,
      blog_category: post?.category,
      cta_position: position,
      button_text: cta.buttonText
    });
    trackEvent('free_lesson_click', {
      blog_slug: post?.slug,
      source: `blog_${position}`
    });
  };

  const targetUrl = appendUtmToUrl(`/ucretsiz-tanisma-dersi?kategori=${encodeURIComponent(cta.targetQuotaCategory)}&ref=blog_${position}`);

  return (
    <div className={`my-8 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-indigo-50/40 to-slate-50 p-6 md:p-8 shadow-sm ${position === 'mid_content' ? 'relative' : ''}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <span className="material-symbols-outlined text-sm">{cta.icon}</span>
            <span>{cta.badge}</span>
          </div>
          <h3 className="text-lg md:text-xl font-extrabold text-slate-900 leading-snug">
            {cta.title}
          </h3>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-xl">
            {cta.subtitle}
          </p>
        </div>

        <div className="w-full md:w-auto flex-shrink-0">
          <Link
            to={targetUrl}
            onClick={handleCtaClick}
            className="w-full md:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/95 hover:scale-102 transition-all cursor-pointer"
          >
            <span>{cta.buttonText}</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogDynamicCta;
