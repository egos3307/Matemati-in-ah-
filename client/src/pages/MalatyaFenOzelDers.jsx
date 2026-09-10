import { useState } from 'react';
import SEO from '../components/SEO';

const MalatyaFenOzelDers = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqList = [
    {
      question: 'Malatya\'da yüz yüze fen özel dersleri hangi sınıf seviyelerine veriliyor?',
      answer: 'Malatya\'da fen bilimleri yüz yüze özel ders çalışmalarımız tamamen ortaokul kademesine yöneliktir: 5, 6, 7 ve 8. sınıf LGS hazırlık öğrencilerini kapsamaktadır.'
    },
    {
      question: 'LGS Fen Bilimleri yeni nesil sorularında nasıl bir çalışma yöntemi izleniyor?',
      answer: 'LGS Fen Bilimleri sorularında grafik okuma, hipotez test etme, deney düzeneklerini yorumlama ve paragraf analizi kilit önem taşır. Derslerde soru köklerini doğru okuma teknikleri yüz yüze pratiklerle aktarılır.'
    },
    {
      question: '5, 6 ve 7. sınıf ortaokul öğrencilerinde fen konuları nasıl pekiştiriliyor?',
      answer: 'Hücre, kuvvet, ısı-madde ve elektrik gibi soyut kavramlar şematik anlatımlar, görsel öğeler ve günlük yaşam örnekleriyle somutlaştırılarak öğretilir.'
    },
    {
      question: 'Malatya\'da matematik dersi için de destek alabilir miyiz?',
      answer: 'Evet. Sayfamız üzerinden Malatya matematik özel ders rehberimizi inceleyerek ortaokul ve LGS matematik ders süreçlerimiz hakkında detaylı bilgiye ulaşabilirsiniz.'
    }
  ];

  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://fullematematigi.com.tr/malatya-fen-ozel-ders/#webpage',
        url: 'https://fullematematigi.com.tr/malatya-fen-ozel-ders',
        name: 'Malatya Fen Özel Ders | Ortaokul & LGS Yüz Yüze Fen Bilimleri Eğitimi',
        description: 'Malatya yüz yüze fen özel ders ve LGS fen bilimleri rehberi. 5, 6, 7 ve 8. sınıf ortaokul öğrencileri için birebir yüz yüze fen bilimleri ders çalışma yöntemleri.',
        inLanguage: 'tr-TR'
      },
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://fullematematigi.com.tr/#organization',
        name: 'Fullematematiği',
        url: 'https://fullematematigi.com.tr/',
        logo: 'https://fullematematigi.com.tr/logo.png',
        description: 'Türkiye\'de LGS, TYT, AYT ve ortaokul öğrencileri için fen bilimleri ve akademik rehberlik platformu.'
      },
      {
        '@type': 'Service',
        '@id': 'https://fullematematigi.com.tr/malatya-fen-ozel-ders/#service',
        name: 'Malatya Yüz Yüze Ortaokul Fen Bilimleri Özel Ders Hizmeti',
        serviceType: 'Fen Bilimleri Özel Ders',
        provider: { '@id': 'https://fullematematigi.com.tr/#organization' },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Malatya'
        },
        description: 'Malatya ilinde 5, 6, 7 ve 8. sınıf ortaokul öğrencileri için yüz yüze fen bilimleri ve LGS fen hazırlık rehberliği.'
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://fullematematigi.com.tr/malatya-fen-ozel-ders/#faq',
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
        title="Malatya Fen Özel Ders | Ortaokul & LGS Yüz Yüze Fen Bilimleri Eğitimi"
        description="Malatya yüz yüze fen özel ders ve LGS fen bilimleri rehberi. 5, 6, 7 ve 8. sınıf ortaokul öğrencileri için birebir yüz yüze fen bilimleri ders çalışma yöntemleri."
        path="/malatya-fen-ozel-ders"
        keywords="Malatya fen özel ders, Malatya fen bilimleri özel ders, Malatya ortaokul fen özel ders, Malatya LGS fen özel ders, Malatya yüz yüze fen özel ders, Malatya 5. sınıf fen özel ders, Malatya 6. sınıf fen özel ders, Malatya 7. sınıf fen özel ders, Malatya 8. sınıf fen özel ders"
        schemaData={schemaData}
      />

      <div className="bg-slate-50 min-h-screen text-slate-800">
        {/* Breadcrumb Navigation */}
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <a href="/" className="hover:text-primary transition-colors">Ana Sayfa</a>
            <span>&gt;</span>
            <span className="text-slate-900 font-bold">Malatya Fen Özel Ders</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-cyan-950 text-white rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <span className="inline-block bg-teal-500/20 text-teal-300 text-xs sm:text-sm font-bold px-3 py-1 rounded-full mb-4 border border-teal-500/30">
                Malatya Yüz Yüze Ortaokul Fen Bilimleri
              </span>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4 text-white">
                Malatya Ortaokul Fen Özel Ders &amp; LGS Fen Bilimleri Rehberi
              </h1>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
                Malatya'da 5, 6, 7 ve 8. sınıf ortaokul öğrencileri için yüz yüze verilen fen bilimleri özel ders hazırlık rehberi. Deney mantığı, görsel anlatım ve LGS yeni nesil soru çözümleriyle netlerinizi yükseltin.
              </p>
              <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-medium text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  Yüz Yüze Birebir Anlatım
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  5-8. Sınıf Ortaokul Müfredatı
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  LGS Fen Bilimleri Net Odaklı
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Ortaokul Yüz Yüze Fen Vurgusu */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
              Malatya'da Yüz Yüze Ortaokul Fen Özel Dersinin Önemi
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Fen Bilimleri dersi, sadece ezber bilgi içeren bir ders değildir. Fizik, kimya ve biyoloji temellerinin atıldığı ortaokul yıllarında mantık yürütme, grafik yorumlama ve neden-sonuç ilişkileri kurma becerisi kazandırılmalıdır.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Malatya yüz yüze fen bilimleri özel ders çalışmalarında öğrencilerin grafik, tablo ve deney sorularındaki kavram yanılgıları birebir analiz edilerek ortadan kaldırılır.
            </p>
          </div>
        </section>

        {/* Section 2: 5, 6, 7, 8. Sınıf Müfredat Kapsamı */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            Ortaokul Sınıf Seviyelerine Göre Fen Bilimleri Çalışmaları
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">5.S</span>
                <h3 className="text-base font-bold text-slate-900">Malatya 5. Sınıf Fen Özel Ders</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Güneş, Dünya ve Ay hareketleri, canlılar dünyası, kuvvetin ölçülmesi, sürtünme kuvveti, maddenin hal değişimleri ve ışığın yayılması konularında sağlam temel oluşturulur.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">6.S</span>
                <h3 className="text-base font-bold text-slate-900">Malatya 6. Sınıf Fen Özel Ders</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Güneş sistemi ve tutulmalar, vücudumuzdaki sistemler (destek-hareket, sindirim, dolaşım), bileşke kuvvet, madde ve ısı, sesin özellikleri detaylıca işlenir.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm">7.S</span>
                <h3 className="text-base font-bold text-slate-900">Malatya 7. Sınıf Fen Özel Ders</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Uzay araştırmaları, hücre organelleri, mitoz-mayoz bölünme, kütle ve ağırlık ilişkisi, saf maddeler, atomun yapısı ve aynalar konularında derinlemesine hazırlık yapılır.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-900 font-bold flex items-center justify-center text-sm">8.S</span>
                <h3 className="text-base font-bold text-slate-900">Malatya 8. Sınıf LGS Fen Özel Ders</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                LGS sınavının en ağırlıklı üniteleri olan Mevsimler ve İklim, DNA ve Genetik Kod, Sıvı ve Katı Basıncı, Asit-Baz tepkimeleri, Basit Makineler ve Elektrik Yükleri üzerine yoğunlaşılır.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Ders İşleyiş ve LGS Fen Taktikleri */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
              LGS Fen Bilimlerinde 20/20 Net Yapma Stratejisi
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 font-bold block mb-1">Görsel ve Deney Düzeneklerini Doğru Okuma:</strong>
                LGS Fen sorularında bağımlı değişken, bağımsız değişken ve kontrol edilen değişken kavramları sıklıkla sorulmaktadır. Yüz yüze derslerde bu değişkenlerin tespiti pratik örneklerle pekiştirilir.
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 font-bold block mb-1">Grafik ve Tablo Yorumlama:</strong>
                Basınç, sıcaklık ve genetik çaprazlama sorularında verilen grafikleri hatasız matematiksel verilere aktarma alışkanlığı kazandırılır.
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-900 font-bold block mb-1">Çoklu Branş Desteği:</strong>
                LGS hazırlık sürecinde fen bilimlerinin yanı sıra matematik başarısı da hayati önem taşır. Bu noktada <a href="/malatya-matematik-ozel-ders" className="text-teal-700 font-bold hover:underline">Malatya matematik özel ders</a> çalışma planlarımızla birlikte entegre bir akademik yol izlenebilir.
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Sıkça Sorulan Sorular */}
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

        {/* Section 5: Contextual Internal Links */}
        <section className="max-w-6xl mx-auto px-4 py-8 mb-12">
          <div className="bg-teal-50/60 rounded-2xl p-6 border border-teal-100">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
              İlgili Ortaokul Rehberleri &amp; Diğer Şehir Derslerimiz
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              Ortaokul müfredatı ve LGS hazırlık süreciniz için faydalanabileceğiniz ders rehberlerimiz:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <a href="/malatya-matematik-ozel-ders" className="bg-white text-teal-900 px-3 py-2 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors">
                Malatya Matematik Özel Ders Rehberi
              </a>
              <a href="/blog/8-sinif-lgs-matematik-tum-konulari-ve-lgs-mufredati" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                8. Sınıf LGS Tüm Konuları
              </a>
              <a href="/blog/5-sinif-matematik-tum-konulari-ve-mufredat-rehberi" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                5. Sınıf Matematik Müfredatı
              </a>
              <a href="/blog/6-sinif-matematik-tum-konulari-ve-mufredat-rehberi" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                6. Sınıf Matematik Rehberi
              </a>
              <a href="/blog/7-sinif-matematik-tum-konulari-ve-mufredat-rehberi" className="bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:text-primary hover:border-primary transition-colors">
                7. Sınıf Matematik Rehberi
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

export default MalatyaFenOzelDers;
