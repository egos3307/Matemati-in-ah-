import { useState } from 'react';
import SEO from '../components/SEO';

const MalatyaMatematikOzelDers = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqList = [
    {
      question: 'Malatya\'da yüz yüze matematik özel dersleri hangi mekanizmada yürütülüyor?',
      answer: 'Eğitimlerimiz öğrencinin mevcut seviyesine göre planlanan birebir çalışma oturumları ile ilerler. Konu kavrama, soru çözüm pratikleri ve haftalık ödevlendirmelerle desteklenir.'
    },
    {
      question: 'Malatya\'da LGS ve YKS adayları için yüz yüze dersler ne zaman başlamalı?',
      answer: 'Sınav senesinde konuların yetişmesi ve deneme çözümlerine erken başlanması adına dönem başından itibaren planlama yapılması önerilmektedir.'
    },
    {
      question: 'Ortaokul veya lise okul sınavı notlarını yükseltmek için uygun mudur?',
      answer: 'Evet. Yazılı sınav tarihlerinden önce okul müfredatı ile birebir uyumlu çalışma yapılarak yazılı odaklı hazırlık imkanı sunulmaktadır.'
    },
    {
      question: 'Malatya fen bilimleri alanında da özel ders imkanı var mıdır?',
      answer: 'Evet. Ortaokul kademesinde fen bilgisi ve LGS fen netlerini artırmak isteyen öğrencilerimiz için sayfamızdan detaylarını inceleyebileceğiniz Malatya ortaokul fen özel ders rehberimizi de değerlendirebilirsiniz.'
    }
  ];

  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://matematikinsahi.com/malatya-matematik-ozel-ders/#webpage',
        url: 'https://matematikinsahi.com/malatya-matematik-ozel-ders',
        name: 'Malatya Matematik Özel Ders | Yüz Yüze LGS, TYT & AYT Matematik Eğitimi',
        description: 'Malatya yüz yüze matematik özel ders rehberi. LGS, YKS TYT-AYT ve ortaokul-lise müfredatına uygun birebir yüz yüze matematik ders çalışma metodolojisi ve sınav hazırlığı.',
        inLanguage: 'tr-TR'
      },
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://matematikinsahi.com/#organization',
        name: 'Matematiğin Şahı',
        url: 'https://matematikinsahi.com/',
        logo: 'https://matematikinsahi.com/logo.png',
        description: 'Türkiye\'de LGS, TYT, AYT ve KPSS öğrencileri için matematik özel ders ve akademik rehberlik platformu.'
      },
      {
        '@type': 'Service',
        '@id': 'https://matematikinsahi.com/malatya-matematik-ozel-ders/#service',
        name: 'Malatya Yüz Yüze Matematik Özel Ders Hizmeti',
        serviceType: 'Matematik Özel Ders',
        provider: { '@id': 'https://matematikinsahi.com/#organization' },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Malatya'
        },
        description: 'Malatya ilinde ortaokul, LGS, lise ve YKS (TYT/AYT) grupları için yüz yüze birebir matematik eğitimi ve akademik takip rehberliği.'
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://matematikinsahi.com/malatya-matematik-ozel-ders/#faq',
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
        title="Malatya Matematik Özel Ders | Yüz Yüze LGS, TYT & AYT Matematik Eğitimi"
        description="Malatya yüz yüze matematik özel ders rehberi. LGS, YKS TYT-AYT ve ortaokul-lise müfredatına uygun birebir yüz yüze matematik ders çalışma metodolojisi ve sınav hazırlığı."
        path="/malatya-matematik-ozel-ders"
        keywords="Malatya matematik özel ders, Malatya özel ders, Malatya yüz yüze matematik özel ders, Malatya TYT matematik özel ders, Malatya AYT matematik özel ders, Malatya LGS matematik özel ders, Malatya ortaokul matematik özel ders, Malatya lise matematik özel ders"
        schemaData={schemaData}
      />

      <div className="bg-slate-50 min-h-screen text-slate-800">
        {/* Breadcrumb Navigation */}
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <a href="/" className="hover:text-primary transition-colors">Ana Sayfa</a>
            <span>&gt;</span>
            <span className="text-slate-900 font-bold">Malatya Matematik Özel Ders</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <span className="inline-block bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-4 border border-emerald-500/30">
                Malatya Yüz Yüze Eğitim Hizmeti
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
                Malatya Matematik Özel Ders &amp; Yüz Yüze Başarı Rehberi
              </h1>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
                Malatya'da LGS, YKS TYT/AYT ve okul derslerinde matematik başarısını artırmak isteyen öğrenciler için hazırlanan yüz yüze birebir özel ders çalışma rehberi.
              </p>
              <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-medium text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  Birebir Yüz Yüze Anlatım
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  MEB &amp; ÖSYM Odaklı Sorular
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  Düzenli İlerleme Takibi
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Malatya Yüz Yüze Ders Vurgusu */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
              Malatya'da Yüz Yüze Birebir Matematik Dersinin Avantajları
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Malatya matematik özel ders süreci, öğrencinin soru çözümündeki kalem oynatma hızını, işlem hatalarını ve mantık kurma alışkanlıklarını anında görmeyi sağlar. Yüz yüze etkileşim sayesinde anlaşılamayan adımlar sıcağı sıcağına tekrarlanır.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Özellikle sayısal derslerde başarı, sürekli soru çözme pratiği ve doğru çözüm yollarını öğrenmekle mümkündür. Birebir yüz yüze modelde öğrenciye özel temposuna göre rehberlik sunulmaktadır.
            </p>
          </div>
        </section>

        {/* Section 2: Hangi Sınıf Seviyeleri İçin Uygundur */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            Malatya Özel Ders Programı Hangi Seviyeleri Kapsar?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Malatya Ortaokul Matematik Özel Ders (5, 6, 7 &amp; 8. Sınıf LGS)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                5, 6 ve 7. sınıflarda temel matematik kavramları oturtulurken; 8. sınıf LGS aşamasında yeni nesil soru mantığı ve zaman yönetimi çalışılır.
              </p>
              <p className="text-xs text-slate-500">
                Ayrıca fen bilgisi desteği arayan velilerimiz için <a href="/malatya-fen-ozel-ders" className="text-emerald-700 font-bold hover:underline">Malatya ortaokul fen özel ders</a> sayfamız da rehber niteliğindedir.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Malatya Lise Matematik Özel Ders (9, 10 &amp; 11. Sınıf)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Lise müfredatında yer alan mantık, kümeler, denklemler, fonksiyonlar ve trigonometri gibi kilit konularda sınav odaklı anlatım yapılır.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Malatya TYT &amp; AYT Matematik Özel Ders (12. Sınıf &amp; Mezun)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                YKS 2026-2027 maratonuna hazırlanan adaylar için TYT matematik temel kavramlar, problemler ve AYT türev-integral hedefleri kişiselleştirilir.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Ders Metodolojisi */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              Malatya Yüz Yüze Matematik Eğitimi Ders Metodolojimiz
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h3 className="font-bold text-slate-900 text-base mb-2">1. Birebir Konu Kavrama</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Konunun temel kuralları, püf noktaları ve kısa çözüm yolları örneklerle öğrenciye aktarılır.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h3 className="font-bold text-slate-900 text-base mb-2">2. Kademeli Soru Analizi</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Kolaydan zora doğru sıralanan soru tipleri çözülerek öğrencinin adım adım ilerlemesi sağlanır.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h3 className="font-bold text-slate-900 text-base mb-2">3. Sınav Tarzı Problem Çözümü</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  ÖSYM ve MEB örnek soruları baz alınarak grafik, tablo ve günlük yaşam problemleri üzerinde durulur.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h3 className="font-bold text-slate-900 text-base mb-2">4. İlerleme ve Ödev Kontrolü</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Her ders öncesinde verilen ödevler değerlendirilir, yapılamayan sorular yeniden gözden geçirilir.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Sıkça Sorulan Sorular */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              Malatya Matematik Özel Ders Hakkında Sık Sorulan Sorular
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

        {/* Section 5: Contextual Internal Links */}
        <section className="max-w-6xl mx-auto px-4 py-8 mb-12">
          <div className="bg-emerald-50/60 rounded-2xl p-6 border border-emerald-100">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
              İlgili Matematik &amp; Fen Bilimleri İçeriklerimiz
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              Malatya'daki öğrencilerimiz için hazırladığımız fen dersi rehberimiz ve sınavlara yönelik kapsamlı blog yazılarımız:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <a href="/malatya-fen-ozel-ders" className="bg-white text-emerald-800 px-3 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
                Malatya Ortaokul Fen Özel Ders Rehberi
              </a>
              <a href="/blog/8-sinif-lgs-matematik-tum-konulari-ve-lgs-mufredati" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                8. Sınıf LGS Matematik Konuları
              </a>
              <a href="/blog/12-sinif-ayt-matematik-tum-konulari-ve-yks-mufredati" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                12. Sınıf AYT Matematik Konuları
              </a>
              <a href="/blog/7-sinif-matematik-tum-konulari-ve-mufredat-rehberi" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                7. Sınıf Matematik Müfredat Rehberi
              </a>
              <a href="/blog/tyt-ayt-matematik-geometri-net-artirma-taktikleri" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                Matematik Net Artırma Taktikleri
              </a>
              <a href="/tarsus-matematik-ozel-ders" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                Tarsus Matematik Özel Ders
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default MalatyaMatematikOzelDers;
