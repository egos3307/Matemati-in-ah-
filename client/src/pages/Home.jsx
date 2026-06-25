import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  // Testimonials / Success Stories Data
  const testimonials = [
    {
      name: "Y** Y**",
      content: "Hocam cidden bana çok büyük katkınız oldu 5 netten 21 nete kadar çıkardınız beni cidden emeğiniz üzerimde çok fazla her şey için teşekkür ediyorum ki hocam ders almaya devam edicem o da deneme analizi için",
      grade: "KPSS Özel Ders"
    },
    {
      name: "F** F**",
      content: "sağolun hocam valla emeğiniz cok üzerimde emeğinize sağlık çok teşekkür ediyorum siz olmasanız yapamazdım derslerimi yükseltip başarılarımın devam etmesi için elimden geleni yapacağım",
      grade: "9. Sınıf"
    },
    {
      name: "B**",
      content: "Günaydın hocam. Sene boyunca derslerimizde gösterdiğiniz rehberlik ve bitmeyen enerjiniz sayesinde bu başarıya ulaştım. Üzerimdeki emeğiniz için sonsuz teşekkürler.",
      grade: "Fen Lisesi Öğrencimiz"
    },
    {
      name: "S**",
      content: "Oncelikle çok teşekkür ediyorum çünkü bu güne göndereceğini söylememişti. Dersin çok iyi geçtiğini ,senin ders anlatmanı iyi anladığını ve hatta analitik geometriyle ilgili çok zevkliymiş falan dedi. Dersten çok memnun çıkınca ben de çok takip etmiyorum. Ama seni ödev konusunda yorarsa mutlaka haber ver ki biz de hemen Şimdiye kadar anlıyorum deyip severek dinlediği ilk matematikçi sensin. Tekrardan çok teşekkür ediyorum.",
      grade: "11 Sınıf Velimiz"
    },
    {
      name: "M** S**",
      content: "Hocam matematik sınavından 100 almışım.",
      grade: "11 Sınıf Öğrencimiz"
    }
  ];

  // Carousel States
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [fade, setFade] = useState(true);

  // Transition slide helper
  const handleSlideChange = (newIndex) => {
    setFade(false);
    setTimeout(() => {
      setActiveTestimonial(newIndex);
      setFade(true);
    }, 200);
  };

  // Autoplay Effect
  useEffect(() => {
    const timer = setInterval(() => {
      handleSlideChange((activeTestimonial + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeTestimonial]);

  // Free Trial Form State
  const [trialType, setTrialType] = useState('SELF'); // SELF, CHILD
  const [trialStudentName, setTrialStudentName] = useState('');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialGrade, setTrialGrade] = useState('');
  const [trialSuccess, setTrialSuccess] = useState('');
  const [trialError, setTrialError] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);



  const scrollToForm = () => {
    const element = document.getElementById('tanisma-dersi');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTrialSubmit = async (e) => {
    e.preventDefault();
    setTrialLoading(true);
    setTrialSuccess('');
    setTrialError('');
    try {
      await axios.post('/api/trial-requests', {
        type: trialType,
        studentName: trialStudentName,
        email: trialEmail,
        phone: trialPhone,
        grade: trialGrade,
      });
      setTrialSuccess('Tanışma dersi talebiniz başarıyla alınmıştır. Öğretmenimiz en kısa sürede sizinle iletişime geçecektir.');
      setTrialStudentName('');
      setTrialEmail('');
      setTrialPhone('');
      setTrialGrade('');
    } catch (err) {
      setTrialError(err.response?.data?.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setTrialLoading(false);
    }
  };



  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-24" id="ana-sayfa">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
                <span className="material-symbols-outlined text-sm">star</span>
                <span>İlk Dersin Bizden: Ücretsiz Tanışma Dersi</span>
              </div>
              <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 lg:text-7xl">
                Matematiği Full'e, <span className="text-primary">Hedeflerine Ulaş!</span>
              </h1>
              <p className="text-lg leading-relaxed text-slate-600">
                Uzman hocalar eşliğinde matematik korkunu yen, temelini sağlamlaştır ve sınavda hayalindeki başarıyı yakala. Sana özel çalışma planıyla her şey daha kolay.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <button onClick={scrollToForm} className="flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105 cursor-pointer">
                  Ücretsiz Deneme Dersi
                </button>
                <button className="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-primary/20 px-8 text-lg font-bold text-primary hover:bg-primary/5">
                  <span className="material-symbols-outlined">play_circle</span>
                  Tanıtım Videosu
                </button>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Ücretsiz Tanışma Dersi Nedir?</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Sistemi yakından tanımak ve hocalarımızla tanışmak için ilk dersinizi tamamen ücretsiz olarak planlayabilirsiniz. Hiçbir taahhüt gerekmez.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative hidden md:block max-w-md mx-auto w-full">
              <div className="absolute -inset-4 rounded-xl bg-primary/10 blur-3xl"></div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-primary shadow-2xl flex items-center justify-center">
                <img alt="Matematik öğretmeni kollarını bağlamış gülümsüyor" className="h-full w-full object-cover" src="/untitled-design.png"/>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-primary px-6 py-12 text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="text-4xl font-black">98%</p>
              <p className="text-sm font-medium opacity-80">Başarı Oranı</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">50k+</p>
              <p className="text-sm font-medium opacity-80">Çözülen Soru</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">1500+</p>
              <p className="text-sm font-medium opacity-80">Mutlu Öğrenci</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">7/24</p>
              <p className="text-sm font-medium opacity-80">Canlı Destek</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10" id="ozellikler">
          <div className="mb-16 flex flex-col items-center text-center">
            <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Neden Fullematematiği?</h2>
            <p className="max-w-2xl text-lg text-slate-600">
              Geleneksel eğitim metodlarını bir kenara bırakın. Teknoloji ve uzmanlığın birleştiği noktada en verimli öğrenme deneyimini yaşayın.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <span className="material-symbols-outlined text-3xl">video_camera_front</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Canlı Dersler</h3>
              <p className="text-slate-600">Haftalık belirlenen saatlerde interaktif sınıflarda hocalarımıza anında soru sorma ve konu tekrarı yapma imkanı.</p>
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <span className="material-symbols-outlined text-3xl">person_search</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Birebir Takip</h3>
              <p className="text-slate-600">Her öğrenciye atanan eğitim koçu ile gelişiminiz adım adım izlenir, zayıf noktalarınıza özel çalışma programı hazırlanır.</p>
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-primary/10 bg-white p-8 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <span className="material-symbols-outlined text-3xl">play_circle</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Soru Çözüm Videoları</h3>
              <p className="text-slate-600">Binlerce sorunun detaylı, püf noktalarıyla anlatıldığı video kütüphanemize 7/24 sınırsız erişim sağlayın.</p>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10" id="urunlerimiz">
          <div className="mb-16 flex flex-col items-center text-center">
            <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Popüler Ürünlerimiz</h2>
            <p className="max-w-2xl text-lg text-slate-600">
              Matematik yolculuğunda sana yardımcı olacak en iyi kaynakları keşfet.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { id: 1, name: 'YKS / TYT MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '350 TL', image: '/IMG_2943.jpeg' },
              { id: 2, name: 'YKS / AYT MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '350 TL', image: '/IMG_2943.jpeg' },
              { id: 3, name: 'KPSS MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '350 TL', image: '/IMG_2943.jpeg' },
              { id: 4, name: 'LGS MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '199 TL', image: '/IMG_2943.jpeg' }
            ].map((product) => (
              <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white transition-all hover:shadow-xl">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <div className="flex flex-col gap-2 p-6">
                  <h3 className="font-bold text-slate-900">{product.name}</h3>
                  <p className="text-primary font-black">{product.price}</p>
                  <a 
                    href="https://www.shopier.com/fullematematigi" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 flex h-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    Satın Al
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <a 
              href="https://www.shopier.com/fullematematigi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 px-8 py-3 text-sm font-bold text-slate-900 hover:bg-slate-900 hover:text-white transition-all"
            >
              Tüm Ürünleri Gör
              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-24 border-t border-slate-100" id="referanslar">
          <div className="mx-auto max-w-5xl px-6 lg:px-10">
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1 text-xs font-black uppercase tracking-wider text-primary">
                Başarı Yolculuklarımız
              </span>
              <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">
                Öğrenci ve Velilerimizin Başarı Yolculuğu
              </h2>
              <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
                Birlikte çalıştığımız öğrencilerin ve destek olduğumuz velilerimizin başarı hikayeleri ve samimi yorumları.
              </p>
            </div>

            <div className="relative mx-auto max-w-3xl">
              {/* Main Slider Card Container */}
              <div className="overflow-hidden rounded-3xl bg-white p-8 md:p-12 shadow-xl border border-slate-100/80 transition-all duration-300 hover:shadow-2xl relative min-h-[320px] flex flex-col justify-between">
                {/* Decorative Quote Icon in background */}
                <span className="absolute right-8 top-6 text-slate-100 font-serif text-[120px] leading-none pointer-events-none select-none">
                  ”
                </span>
                
                {/* Active Slide Content with Fade Transition */}
                <div className={`relative z-10 flex flex-col gap-6 h-full justify-between flex-1 transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}>
                  <div>
                    {/* Header: Name and Stars */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {testimonials[activeTestimonial].name}
                      </h4>
                      <div className="flex gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined fill-1 text-lg">star</span>
                        ))}
                      </div>
                    </div>

                    {/* Content: Testimonial Message */}
                    <p className="mt-6 text-base md:text-lg leading-relaxed text-slate-700 font-medium italic">
                      "{testimonials[activeTestimonial].content}"
                    </p>
                  </div>

                  {/* Footer: Grade/Class */}
                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/5 px-4 py-2 text-sm font-bold text-primary">
                      <span className="material-symbols-outlined text-sm">school</span>
                      {testimonials[activeTestimonial].grade}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSlideChange((activeTestimonial - 1 + testimonials.length) % testimonials.length)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                        aria-label="Önceki yorum"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button 
                        onClick={() => handleSlideChange((activeTestimonial + 1) % testimonials.length)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                        aria-label="Sonraki yorum"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicator Dots */}
              <div className="mt-8 flex justify-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleSlideChange(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      index === activeTestimonial ? 'bg-primary w-8' : 'bg-slate-300 w-2.5 hover:bg-slate-400'
                    }`}
                    aria-label={`Yorum ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Free Trial Lesson Section */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10" id="tanisma-dersi">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-8 md:p-12 shadow-xl">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl"></div>
            
            <div className="relative mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1 text-xs font-black uppercase tracking-wider text-primary">
                Sınırlı Kontenjan
              </span>
              <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-4xl">Ücretsiz Tanışma Dersi Başvurusu</h2>
              <p className="mt-4 text-slate-600">
                Matematik seviyenizi belirlemek ve size en uygun çalışma planını hazırlamak için ücretsiz birebir tanışma dersi oluşturun.
              </p>
            </div>

            <form onSubmit={handleTrialSubmit} className="relative mx-auto mt-12 max-w-2xl rounded-2xl bg-white p-8 shadow-lg border border-slate-100 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">Ders Kimin İçin?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTrialType('SELF')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 border-2 font-bold transition-all ${
                      trialType === 'SELF'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">person</span>
                    Kendim İçin
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrialType('CHILD')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 border-2 font-bold transition-all ${
                      trialType === 'CHILD'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">child_care</span>
                    Çocuğum İçin
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Öğrenci Adı Soyadı</label>
                  <input
                    type="text"
                    required
                    value={trialStudentName}
                    onChange={(e) => setTrialStudentName(e.target.value)}
                    placeholder="Örn: Ali Yılmaz"
                    className="rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-primary outline-none px-4 py-2"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Sınıf / Seviye</label>
                  <select
                    required
                    value={trialGrade}
                    onChange={(e) => setTrialGrade(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-primary outline-none px-4 py-2"
                  >
                    <option value="">Seçiniz</option>
                    <option value="5">5. Sınıf</option>
                    <option value="6">6. Sınıf</option>
                    <option value="7">7. Sınıf</option>
                    <option value="8">8. Sınıf (LGS)</option>
                    <option value="9">9. Sınıf</option>
                    <option value="10">10. Sınıf</option>
                    <option value="11">11. Sınıf</option>
                    <option value="12">12. Sınıf (YKS)</option>
                    <option value="Mezun">Mezun (YKS)</option>
                    <option value="KPSS">KPSS Adayı</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">E-posta Adresi</label>
                  <input
                    type="email"
                    required
                    value={trialEmail}
                    onChange={(e) => setTrialEmail(e.target.value)}
                    placeholder="ali@ornek.com"
                    className="rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-primary outline-none px-4 py-2"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Telefon Numarası</label>
                  <input
                    type="tel"
                    required
                    value={trialPhone}
                    onChange={(e) => setTrialPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-primary outline-none px-4 py-2"
                  />
                </div>
              </div>

              {trialError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  {trialError}
                </div>
              )}

              {trialSuccess && (
                <div className="text-sm text-green-600 bg-green-50 p-4 rounded-lg border border-green-200 font-medium">
                  {trialSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={trialLoading}
                className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/95 hover:shadow-xl disabled:opacity-50 cursor-pointer"
              >
                {trialLoading ? 'Başvuru Gönderiliyor...' : 'Ücretsiz Tanışma Dersi Talebi Oluştur'}
              </button>
            </form>
          </div>
        </section>


      </main>

      {/* Footer */}
      <footer className="bg-white px-6 py-12 text-slate-600 border-t border-primary/10">
        <div className="mx-auto max-w-7xl lg:px-10">
          <div className="grid gap-12 border-b border-slate-100 pb-12 md:grid-cols-4">
            <div className="col-span-2 flex flex-col gap-6">
              <div className="flex items-center gap-3 text-slate-900">
                <img src="/logo.png" alt="Fullematematik Logo" className="h-10 w-10 object-contain" />
                <h2 className="text-xl font-bold tracking-tight">Fullematematiği</h2>
              </div>
              <p className="max-w-md leading-relaxed">
                Türkiye'nin en interaktif matematik platformu olarak, öğrencilerin hedeflerine ulaşmasında en büyük destekçisiyiz. Kaliteli içerik ve uzman kadromuzla yanınızdayız.
              </p>
              <div className="flex gap-4">
                <a className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-primary hover:text-white" href="https://instagram.com/fullematematigi" target="_blank" rel="noopener noreferrer" title="Instagram">
                  <span className="material-symbols-outlined">camera_alt</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="mb-6 font-bold text-slate-900">Hızlı Linkler</h4>
              <ul className="flex flex-col gap-4">
                <li><Link className="hover:text-primary transition-colors" to="/">Ana Sayfa</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/derslerimiz">Derslerimiz</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/blog">Blog</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/iletisim">İletişim</Link></li>
                <li><a className="hover:text-primary transition-colors" href="#">SSS</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 font-bold text-slate-900">Kurumsal</h4>
              <ul className="flex flex-col gap-4">
                <li><Link className="hover:text-primary transition-colors" to="/derslerimiz">Derslerimiz</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/blog">Blog</Link></li>
                <li><a className="hover:text-primary transition-colors" href="#">Kariyer</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">KVKK</a></li>
                <li><Link className="hover:text-primary transition-colors" to="/iletisim">İletişim</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-6 pt-12 md:flex-row">
            <p className="text-sm">© 2024 Fullematematiği. Tüm hakları saklıdır.</p>
            <div className="flex gap-8 text-sm">
              <a className="hover:text-primary transition-colors" href="#">Gizlilik Politikası</a>
              <a className="hover:text-primary transition-colors" href="#">Kullanım Şartları</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
