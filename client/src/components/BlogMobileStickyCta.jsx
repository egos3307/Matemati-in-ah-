import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';
import { appendUtmToUrl } from '../utils/utm';

const BlogMobileStickyCta = ({ post }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('dismissed_blog_sticky_cta');
    if (isDismissed === 'true') return;

    // Show after scrolling 200px down to prevent immediate overlay
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  const handleClose = (e) => {
    e.stopPropagation();
    sessionStorage.setItem('dismissed_blog_sticky_cta', 'true');
    setIsVisible(false);
    trackEvent('blog_cta_dismiss', { blog_slug: post?.slug, cta_position: 'mobile_sticky' });
  };

  const handleCtaClick = () => {
    trackEvent('blog_cta_click', {
      blog_slug: post?.slug,
      blog_category: post?.category,
      cta_position: 'mobile_sticky',
      button_text: 'Ücretsiz Dersi Planla'
    });
    trackEvent('free_lesson_click', {
      blog_slug: post?.slug,
      source: 'mobile_sticky_cta'
    });

    const categoryParam = post?.category?.includes('LGS') ? 'LGS 2027' : post?.category?.includes('KPSS') ? 'KPSS 2027' : 'YKS 2027';
    navigate(appendUtmToUrl(`/ucretsiz-tanisma-dersi?kategori=${encodeURIComponent(categoryParam)}&ref=sticky_cta`));
  };

  return (
    <div className="fixed bottom-3 left-3 right-20 z-40 md:hidden animate-fade-in">
      <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-primary/20 bg-slate-900/95 backdrop-blur-md p-2.5 pl-3.5 shadow-2xl text-white">
        <div className="flex items-center gap-2 truncate pr-1">
          <span className="text-base">🎓</span>
          <div className="truncate">
            <p className="text-2xs font-extrabold uppercase text-primary tracking-wider">Canlı Deneme</p>
            <p className="text-xs font-bold text-slate-100 truncate">İlk Ders Ücretsiz!</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleCtaClick}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-bold text-white shadow-md shadow-primary/30 hover:bg-primary/90 transition-all cursor-pointer whitespace-nowrap"
          >
            Planla
          </button>
          
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogMobileStickyCta;
