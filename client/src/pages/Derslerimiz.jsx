import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SEO from '../components/SEO';

const FALLBACK_CAMPS = [
  {
    id: 'fallback-1',
    badge: '5, 6, 7 ve 8. Sınıflar',
    title: 'Ortaokul Yeni Nesil Soru Çözüm Kampı',
    subtitle: 'LGS ve Okul Sınavları İçin Sağlam Altyapı',
    image: '/IMG_3001.jpeg',
    details: [
      { icon: 'calendar_month', label: 'Tarih', value: '3 Temmuz - 6 Eylül' },
      { icon: 'schedule', label: 'Ders Programı', value: 'Haftada 4 Ders' },
      { icon: 'filter_list', label: 'Toplam', value: '18 Canlı Ders' },
      { icon: 'videocam', label: 'Eğitim Türü', value: 'Online Canlı Eğitim (Zoom)' }
    ],
    description: 'Ders kayıtları Google Drive üzerinden paylaşılacak ve öğrenciler istedikleri zaman tekrar izleyebilecektir. Ders notları ve ödevlendirme desteği mevcuttur.',
    highlights: [
      'Yeni nesil soru mantığını öğren',
      'Matematiksel okuma ve yorumlama becerini geliştir',
      'Temel eksiklerini tamamla',
      'Çözümlü örneklerle soru çözüm tekniklerini öğren',
      'LGS ve okul sınavları için sağlam altyapı oluştur'
    ],
    price: '2500 TL',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20Ortaokul%20Yeni%20Nesil%20Soru%20Çözüm%20Kampı%20hakkında%20bilgi%20almak%20istiyorum.'
  },
  {
    id: 'fallback-2',
    badge: 'Lisans & Ön Lisans Adayları',
    title: 'KPSS Lisans & Ön Lisans Matematik Kampı',
    subtitle: 'Matematikte Eksiklerini Kapat, Netlerini Zirveye Taşı!',
    image: '/IMG_2999.jpeg',
    details: [
      { icon: 'calendar_month', label: 'Tarih', value: '3 Temmuz - 4 Eylül (Lisans Bitiş)' },
      { icon: 'schedule', label: 'Ders Programı', value: 'Haftada 6 Ders (Dersler 40 dk)' },
      { icon: 'filter_list', label: 'Toplam', value: '54 Canlı Ders' },
      { icon: 'videocam', label: 'Eğitim Türü', value: 'Online Canlı Eğitim (Zoom)' }
    ],
    description: 'Kaçırılan dersler için Google Drive üzerinden kayıt erişimi sağlanır. KPSS Lisans ve Ön Lisans Matematik konularının tamamı, konu anlatımları, çözümlü ders notları (PDF), çıkmış soruların detaylı çözümleri ve 35+ çözümlü PDF soru havuzunu içerir.',
    highlights: [
      'Tüm KPSS Lisans ve Ön Lisans matematik konuları',
      'Detaylı konu anlatımları ve çıkmış soruların pratik çözümleri',
      'Özel çözümlü ders notları (PDF) ve 35+ çözümlü PDF soruları',
      'Kaçırılan dersleri dilediğiniz zaman tekrar izleme imkanı',
      'Sınava sağlam ve eksiksiz bir hazırlık süreci'
    ],
    price: '3500 TL',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20KPSS%20Lisans%20&%20Ön%20Lisans%20Matematik%20Kampı%20hakkında%20bilgi%20almak%20istiyorum.'
  }
];

const Derslerimiz = () => {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCamps = async () => {
      try {
        const res = await axios.get('/api/camps');
        if (res.data && res.data.length > 0) {
          const parsedCamps = res.data.map(camp => ({
            ...camp,
            details: typeof camp.details === 'string' ? JSON.parse(camp.details) : camp.details,
            highlights: typeof camp.highlights === 'string' ? JSON.parse(camp.highlights) : camp.highlights
          }));
          setCamps(parsedCamps);
        } else {
          setCamps(FALLBACK_CAMPS);
        }
      } catch (err) {
        console.error('Error fetching camps, loading fallback static camps:', err);
        setCamps(FALLBACK_CAMPS);
      } finally {
        setLoading(false);
      }
    };
    fetchCamps();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center py-24 text-slate-400 font-bold uppercase tracking-wider gap-4">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <span>Kamplar Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-20 pt-8">
      <SEO
        title="Online Matematik Canlı Ders Kampları & Özel Ders"
        description="YKS, LGS ve KPSS için online matematik canlı ders paketleri ve geometri kampları. Sınıf seviyenize en uygun canlı dersi seçin, ilk ders ücretsiz!"
        path="/derslerimiz"
        keywords="matematik canlı ders, online matematik canlı ders, geometri canlı ders, YKS matematik canlı ders, LGS matematik canlı ders, KPSS matematik canlı ders, matematik canlı kurs"
      />
      {/* Header Section */}
      <div className="bg-white py-16 text-center border-b border-primary/10 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary mb-4">
            <span className="material-symbols-outlined text-sm">school</span>
            <span>Eğitim Kamplarımız</span>
          </span>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Sınavlara Bizimle <span className="text-primary">Hazırlanın</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Afişlerdeki detaylı bilgilere göre hazırlanmış, hedeflerinize ulaşmanızı kolaylaştıracak güncel matematik kamplarımızı keşfedin.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {camps.map((camp) => (
            <div 
              key={camp.id} 
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Card Header */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={camp.image}
                  alt={camp.title}
                  className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-105"
                />
                {camp.price && (
                  <span className="absolute top-4 right-4 rounded-full bg-white px-4 py-1.5 text-sm font-black text-primary shadow-lg">
                    {camp.price}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex flex-col justify-end p-6">
                  <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-white uppercase tracking-wider mb-2">
                    {camp.badge}
                  </span>
                  <h2 className="text-xl font-bold text-white md:text-2xl">{camp.title}</h2>
                  <p className="text-sm text-slate-200 mt-1">{camp.subtitle}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col p-6 md:p-8">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                  {camp.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-0.5">
                        {detail.icon}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-slate-400">{detail.label}</p>
                        <p className="text-sm font-bold text-slate-800">{detail.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div className="my-6">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Kamp Detayları</h4>
                  <p className="text-sm leading-relaxed text-slate-600">{camp.description}</p>
                </div>

                {/* Highlights List */}
                <div className="mb-8 flex-1">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Neler Kazanacaksınız?</h4>
                  <ul className="flex flex-col gap-2.5">
                    {camp.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="material-symbols-outlined text-primary text-base mt-0.5 fill-1">
                          check_circle
                        </span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5">
                  <a
                    href={`/kontenjan-dersleri?kategori=${encodeURIComponent(camp.badge?.includes('LGS') || camp.title?.includes('LGS') ? 'LGS 2027' : camp.title?.includes('KPSS') ? 'KPSS 2027' : 'YKS 2027')}`}
                    className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 hover:scale-102"
                  >
                    <span className="material-symbols-outlined">event_seat</span>
                    Yer Ayırt
                  </a>
                  <a
                    href={camp.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    WhatsApp İletişim
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* General Contact Info Banner */}
        <div className="mt-16 rounded-2xl border border-primary/20 bg-primary/5 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold text-slate-900">Kayıtlar ve Detaylı Bilgi</h3>
            <p className="text-slate-600 text-sm max-w-xl">
              Kamplarımıza kayıt olmak, aklınızdaki soruları sormak veya seviyenize en uygun paketi seçmek için bizimle doğrudan iletişime geçebilirsiniz.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <a 
              href="tel:+905350598950" 
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-lg">call</span>
              0535 059 89 50
            </a>
            <a 
              href="https://instagram.com/fullematematigi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-900 px-6 text-sm font-bold text-slate-900 hover:bg-slate-900 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-lg">camera_alt</span>
              @fullematematigi DM
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Derslerimiz;