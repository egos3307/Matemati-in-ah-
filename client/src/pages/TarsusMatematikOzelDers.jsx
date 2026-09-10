import { useState } from 'react';
import SEO from '../components/SEO';

const TarsusMatematikOzelDers = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqList = [
    {
      question: 'Tarsus\'ta yüz yüze matematik özel ders süreçleri nasıl planlanıyor?',
      answer: 'Derslerimiz öğrencinin mevcut okul ve sınav seviyesi analiz edilerek başlar. Konu anlatımı, yeni nesil soru çözümleri ve haftalık takip ile öğrencinin birebir gereksinimlerine göre şekillendirilir.'
    },
    {
      question: 'Dersler hangi sınıf seviyelerini kapsamaktadır?',
      answer: 'Ortaokul (5, 6, 7 ve 8. sınıf LGS hazırlık) ile lise (9, 10, 11 ve 12. sınıf YKS TYT/AYT hazırlık) seviyesindeki tüm öğrenciler için yüz yüze ders imkanı sunulmaktadır.'
    },
    {
      question: 'LGS ve YKS yeni nesil soruları için özel bir çalışma yapılıyor mu?',
      answer: 'Evet. Derslerde sadece klasikler değil, MEB ve ÖSYM mantığına uygun mantık muhakeme, grafik okuma ve yeni nesil problem çözme teknikleri ağırlıklı olarak işlenir.'
    },
    {
      question: 'Matematik temeli zayıf olan öğrenciler için nasıl bir yol izleniyor?',
      answer: 'Temel kavramlar, işlem yeteneği ve basit denklem çözme adımlarından başlanarak aşamalı bir çalışma takvimi uygulanır. Öğrencinin özgüveni desteklenerek net artışı hedeflenir.'
    }
  ];

  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://fullematematigi.com.tr/tarsus-matematik-ozel-ders/#webpage',
        url: 'https://fullematematigi.com.tr/tarsus-matematik-ozel-ders',
        name: 'Tarsus Matematik Özel Ders | Yüz Yüze LGS, TYT & AYT Matematik Rehberi',
        description: 'Tarsus yüz yüze matematik özel ders rehberi. Ortaokul LGS, lise 9-12. sınıf, TYT ve AYT matematik konularında birebir yüz yüze eğitim metodolojimiz.',
        inLanguage: 'tr-TR'
      },
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://fullematematigi.com.tr/#organization',
        name: 'Fullematematiği',
        url: 'https://fullematematigi.com.tr/',
        logo: 'https://fullematematigi.com.tr/logo.png',
        description: 'Türkiye\'de LGS, TYT, AYT ve KPSS öğrencileri için matematik özel ders ve akademik rehberlik platformu.'
      },
      {
        '@type': 'Service',
        '@id': 'https://fullematematigi.com.tr/tarsus-matematik-ozel-ders/#service',
        name: 'Tarsus Yüz Yüze Matematik Özel Ders Hizmeti',
        serviceType: 'Matematik Özel Ders',
        provider: { '@id': 'https://fullematematigi.com.tr/#organization' },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Tarsus, Mersin'
        },
        description: 'Tarsus bölgesinde ortaokul, LGS, lise ve YKS (TYT/AYT) seviyesinde yüz yüze birebir matematik dersi rehberliği.'
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://fullematematigi.com.tr/tarsus-matematik-ozel-ders/#faq',
        mainEntity: faqList.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer
          }
        }))
      }
    ]
  };

  return (
    <>
      <SEO
        title="Tarsus Matematik Özel Ders | Yüz Yüze LGS, TYT & AYT Matematik Rehberi"
        description="Tarsus yüz yüze matematik özel ders rehberi. Ortaokul LGS, lise 9-12. sınıf, TYT ve AYT matematik konularında birebir yüz yüze eğitim metodolojimiz."
        path="/tarsus-matematik-ozel-ders"
        keywords="Tarsus matematik özel ders, Tarsus özel ders, Tarsus yüz yüze matematik özel ders, Tarsus TYT matematik özel ders, Tarsus AYT matematik özel ders, Tarsus LGS matematik özel ders, Tarsus ortaokul matematik özel ders, Tarsus lise matematik özel ders"
        schemaData={schemaData}
      />

      <div className="bg-slate-50 min-h-screen text-slate-800">
        {/* Breadcrumb Navigation */}
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <a href="/" className="hover:text-primary transition-colors">Ana Sayfa</a>
            <span>&gt;</span>
            <span className="text-slate-900 font-bold">Tarsus Matematik Özel Ders</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <span className="inline-block bg-primary/20 text-primary-300 text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-4 border border-primary/30">
                Tarsus Yüz Yüze Matematik Eğitimi
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
                Tarsus Matematik Özel Ders &amp; Yüz Yüze Başarı Rehberi
              </h1>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
                Tarsus bölgesinde LGS, TYT, AYT ve okul derslerine hazırlanan öğrenciler için tasarlanmış yüz yüze matematik özel ders sistemi. Birebir öğrenim mantığıyla matematik netlerini sağlam temellere oturtun.
              </p>
              <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-medium text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  Yüz Yüze Birebir Anlatım
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  LGS &amp; YKS Yeni Nesil Sorular
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  Kişiye Özel Müfredat Planı
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Yüz Yüze Ders Vurgusu */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
              Tarsus'ta Yüz Yüze Matematik Özel Dersinin Önemi
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Matematik, kalabalık sınıf ortamlarında gözden kaçan küçük bilgi eksikliklerinin zamanla büyüdüğü bir alandır. Tarsus yüz yüze matematik özel ders çalışmaları sayesinde öğrencinin kağıt üzerindeki çözüm adımları anlık olarak gözlemlenir, hatalar anında düzeltilir ve işlem alışkanlıkları iyileştirilir.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Özellikle LGS ve YKS gibi belirleyici sınavlarda soru köklerini doğru okuma, mantık yürütme ve zamana karşı yarışma becerisi yüz yüze yapılan disiplinli takiple geliştirilebilir.
            </p>
          </div>
        </section>

        {/* Section 2: Kimler İçin Uygun */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            Tarsus Özel Ders Çalışmaları Kimler İçin Uygundur?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Tarsus Ortaokul Matematik Özel Ders (5, 6, 7 &amp; 8. Sınıf LGS)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ortaokul kademesinde temel işlem becerileri, rasyonel sayılar, denklemler ve LGS 8. sınıf yeni nesil soru mantığı yüz yüze adımlarla pekiştirilir.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Tarsus Lise Matematik Özel Ders (9, 10 &amp; 11. Sınıf)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Lise okul sınavlarına hazırlık, takdir-teşekkür hedefleri ve YKS altyapısı için fonksiyonlar, trigonometri, analitik geometri konularında derinlemesine çalışma yapılır.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Tarsus TYT &amp; AYT Matematik Özel Ders (12. Sınıf &amp; Mezun)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                YKS maratonunda net artırma hedefi olan adaylar için TYT problemler, mantık muhakeme ve AYT türev, integral, limit hazırlığı planlanır.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Ders Süreci & Metodoloji */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              Yüz Yüze Matematik Ders Süreci Nasıl İşler?
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  A
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Mevcut Seviye ve Eksik Tespiti</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    İlk olarak öğrencinin geçmiş yıllardan kalan konu eksikleri ve işlem hataları analiz edilerek başlama noktası belirlenir.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  B
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Konu Anlatımı ve Model Soru Çözümü</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Formül ezberletmek yerine konunun mantığı aktarılır. Temel seviyeden başlayarak derece sorularına doğru aşamalı örnek çözümler gerçekleştirilir.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  C
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">Ödevlendirme ve Sürekli Takip</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Ders sonrasında verilen ödevler bir sonraki buluşmada detaylıca kontrol edilir. Yapılamayan sorular tek tek incelenerek kalıcı öğrenme sağlanır.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Sınav Hazırlık Stratejileri */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white">
              Tarsus Sınav Hazırlığında Matematik Stratejileri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
              <div className="bg-slate-800/70 p-5 rounded-xl border border-slate-700">
                <h3 className="font-bold text-white text-base mb-2">Tarsus LGS Matematik Yaklaşımı</h3>
                <p className="leading-relaxed">
                  LGS matematik soruları uzun metinli ve şekilli sorulardan oluşmaktadır. Öğrencilere soru metnini matematiksel denklemlere dönüştürme ve görsel verileri doğru yorumlama alışkanlığı kazandırılır.
                </p>
              </div>

              <div className="bg-slate-800/70 p-5 rounded-xl border border-slate-700">
                <h3 className="font-bold text-white text-base mb-2">Tarsus TYT &amp; AYT YKS Yaklaşımı</h3>
                <p className="leading-relaxed">
                  TYT tarafında zamana karşı hız kazanma ve problem çözme stratejileri öne çıkarken; AYT tarafında ise ispat mantığı, bilgi birikimi ve analitik düşünme becerisi geliştirilir.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Sıkça Sorulan Sorular */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              Sıkça Sorulan Sorular
            </h2>
            <div className="space-y-4">
              {faqList.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-4 font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 flex justify-between items-center transition-colors text-sm sm:text-base"
                  >
                    <span>{faq.question}</span>
                    <span className="text-slate-500 font-normal text-lg">{openFaq === idx ? '−' : '+'}</span>
                  </button>
                  {openFaq === idx && (
                    <div className="p-4 bg-white text-xs sm:text-sm text-slate-600 border-t border-slate-200 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6: Contextual Internal Links */}
        <section className="max-w-6xl mx-auto px-4 py-8 mb-12">
          <div className="bg-indigo-50/60 rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
              İlgili Matematik Rehberleri &amp; Diğer Şehir Sayfalarımız
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              Sınav hazırlık sürecinizde faydalanabileceğiniz kapsamlı konu rehberlerimiz ve diğer şehir hizmet alanlarımız:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <a href="/blog/tyt-matematik-konulari" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                TYT Matematik Konuları ve Dağılımı
              </a>
              <a href="/blog/lgs-matematik-konulari" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                LGS Matematik Konuları ve Soru Analizi
              </a>
              <a href="/blog/tyt-problemler" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                TYT Problemler Çalışma Rehberi
              </a>
              <a href="/blog/geometride-sekilleri-gormek-ve-geometri-taktikleri" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                Geometride Şekilleri Görme Taktikleri
              </a>
              <a href="/malatya-matematik-ozel-ders" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                Malatya Matematik Özel Ders
              </a>
              <a href="/malatya-fen-ozel-ders" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                Malatya Fen Özel Ders
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default TarsusMatematikOzelDers;
