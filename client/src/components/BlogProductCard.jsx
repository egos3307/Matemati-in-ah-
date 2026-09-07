import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { trackEvent } from '../utils/analytics';
import { getDynamicWhatsAppLink } from '../utils/whatsapp';
import { appendUtmToUrl } from '../utils/utm';

const FALLBACK_PRODUCTS = [
  {
    id: 'lgs-camp',
    category: 'LGS',
    badge: 'LGS 2027 Özel Kamp',
    title: 'Ortaokul Yeni Nesil Soru Çözüm Kampı',
    subtitle: 'LGS ve Okul Sınavları İçin Sağlam Altyapı',
    description: '18 Canlı ders, 7/24 kayıt erişimi, çözümlü ders notları ve birebir soru takibi.',
    price: '2.500 TL',
    image: '/IMG_3001.jpeg',
    targetCategory: 'LGS 2027'
  },
  {
    id: 'kpss-camp',
    category: 'KPSS',
    badge: 'KPSS 2027 Matematik',
    title: 'KPSS Lisans & Ön Lisans Matematik Kampı',
    subtitle: 'Matematikte Eksiklerini Kapat, Netlerini Zirveye Taşı',
    description: '54 Canlı ders, 35+ çözümlü PDF soru havuzu, tüm çıkmış soruların detaylı çözümleri.',
    price: '3.500 TL',
    image: '/IMG_2999.jpeg',
    targetCategory: 'KPSS 2027'
  },
  {
    id: 'yks-camp',
    category: 'YKS',
    badge: 'YKS 2027 TYT / AYT',
    title: 'YKS Matematik Derece Canlı Ders Paketleri',
    subtitle: 'TYT & AYT Konu Anlatımı ve Yeni Nesil Soru Çözüm Grubu',
    description: 'Birebir seviye analizi, haftalık canlı dersler, kişiye özel koçluk takibi.',
    price: '3.500 TL',
    image: '/IMG_2176.png',
    targetCategory: 'YKS 2027'
  }
];

const BlogProductCard = ({ post }) => {
  const navigate = useNavigate();
  const [matchedProduct, setMatchedProduct] = useState(null);

  useEffect(() => {
    const fetchAndMatchProduct = async () => {
      let campsList = [];
      try {
        const res = await axios.get('/api/camps');
        if (res.data && res.data.length > 0) {
          campsList = res.data;
        }
      } catch {
        campsList = [];
      }

      const textToAnalyze = `${post?.title || ''} ${post?.category || ''} ${post?.slug || ''}`.toLowerCase();

      // Find matching product from live backend camps or fallback list
      let selected = null;
      if (textToAnalyze.includes('lgs') || textToAnalyze.includes('8. sınıf') || textToAnalyze.includes('ortaokul')) {
        selected = campsList.find(c => (c.title || c.badge || '').toLowerCase().includes('lgs') || (c.title || '').toLowerCase().includes('ortaokul')) || FALLBACK_PRODUCTS[0];
      } else if (textToAnalyze.includes('kpss') || textToAnalyze.includes('lisans') || textToAnalyze.includes('ön lisans')) {
        selected = campsList.find(c => (c.title || c.badge || '').toLowerCase().includes('kpss')) || FALLBACK_PRODUCTS[1];
      } else {
        selected = campsList.find(c => (c.title || c.badge || '').toLowerCase().includes('yks') || (c.title || '').toLowerCase().includes('tyt')) || FALLBACK_PRODUCTS[2];
      }

      setMatchedProduct(selected);
    };

    fetchAndMatchProduct();
  }, [post]);

  if (!matchedProduct) return null;

  const handleProductClick = () => {
    trackEvent('product_cta_click', {
      blog_slug: post?.slug,
      product: matchedProduct.title,
      price: matchedProduct.price
    });

    const categoryParam = matchedProduct.targetCategory || matchedProduct.badge || 'YKS 2027';
    const targetUrl = appendUtmToUrl(`/kontenjan-dersleri?kategori=${encodeURIComponent(categoryParam)}&ref=blog_product_card`);
    navigate(targetUrl);
  };

  const handleWhatsAppClick = () => {
    trackEvent('whatsapp_click', {
      button_text: `WhatsApp Product - ${matchedProduct.title}`,
      button_location: 'blog_product_card',
      product: matchedProduct.title
    });
  };

  const waUrl = getDynamicWhatsAppLink(post, `Merhaba, ${matchedProduct.title} eğitimi ve güncel kayıt şartları hakkında bilgi almak istiyorum.`);

  return (
    <section className="my-10 rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-md hover:shadow-lg transition-all">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">local_mall</span>
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          İlgili Eğitim Paketi Tavsiyesi
        </span>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {/* Product Image */}
        {matchedProduct.image && (
          <div className="w-full md:w-56 h-48 md:h-auto rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
            <img 
              src={matchedProduct.image} 
              alt={matchedProduct.title} 
              className="w-full h-full object-cover object-center"
            />
            {matchedProduct.price && (
              <span className="absolute top-3 right-3 rounded-full bg-white/95 backdrop-blur-xs px-3 py-1 text-xs font-black text-primary shadow-sm border border-slate-100">
                {matchedProduct.price}
              </span>
            )}
          </div>
        )}

        {/* Product Content */}
        <div className="flex flex-1 flex-col justify-between space-y-4">
          <div>
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
              {matchedProduct.badge || matchedProduct.category || 'Özel Paket'}
            </span>
            <h4 className="text-xl font-bold text-slate-900 leading-snug">
              {matchedProduct.title}
            </h4>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {matchedProduct.subtitle}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
              {matchedProduct.description}
            </p>
          </div>

          {/* Pricing & CTA Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-400 block">Güncel Paket Ücreti</span>
              <span className="text-lg font-black text-primary">{matchedProduct.price || 'Ücretsiz Danışmanlık'}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleProductClick}
                className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary/95 transition-all cursor-pointer"
              >
                <span>İncele ve Başla</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                title="WhatsApp'tan sor"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogProductCard;
