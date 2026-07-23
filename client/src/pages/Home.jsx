import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/SEO';

const YT_CHANNEL_URL = 'https://www.youtube.com/@FULLEMATEM%C4%B0T%C4%B0G%C4%B0';
const IG_URL = 'https://www.instagram.com/fullematematigi';

const IgIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
);

const YtIcon = ({ size = 4 }) => (
  <svg viewBox="0 0 24 24" className={`w-${size} h-${size} fill-current`}><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
);

const SHOWCASE_VIDEOS = [
  { id: 'ig1', type: 'instagram', url: 'https://www.instagram.com/reel/DaArbnxMWD8/', cover: '/IMG_3041.jpeg' },
  { id: 'yt1', type: 'youtube', videoId: 'JtNQS74nez0', url: 'https://www.youtube.com/shorts/JtNQS74nez0' },
  { id: 'yt2', type: 'youtube', videoId: 'PF-dAUN06dA', url: 'https://www.youtube.com/shorts/PF-dAUN06dA' },
  { id: 'ig2', type: 'instagram', url: 'https://www.instagram.com/reel/DaDs07vMLy9/', cover: '/IMG_3042.jpeg' },
];

const SocialFeed = () => {
  const [playing, setPlaying] = useState(null);

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10" id="sosyal-medya">
      <div className="mb-10 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1 text-xs font-black uppercase tracking-wider text-primary mb-4">
          Sosyal Medya
        </span>
        <h2 className="text-2xl font-black text-slate-900 md:text-3xl mb-4">Bizi Takip Edin</h2>
        <div className="flex items-center gap-3">
          <a href={YT_CHANNEL_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm">
            <YtIcon size={4} /> YouTube
          </a>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 text-white px-5 py-2.5 text-sm font-bold transition-all shadow-sm">
            <IgIcon /> Instagram
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SHOWCASE_VIDEOS.map(video => {
          const isPlaying = playing === video.id;

          if (video.type === 'youtube') {
            return (
              <div key={video.id} className="relative rounded-2xl overflow-hidden bg-black shadow-md" style={{ aspectRatio: '9/16' }}>
                {isPlaying ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <button
                    onClick={() => setPlaying(video.id)}
                    className="absolute inset-0 w-full h-full group"
                  >
                    <img
                      src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                      alt="YouTube video"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-1"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      <YtIcon size={3} /> Shorts
                    </div>
                  </button>
                )}
              </div>
            );
          }

          return (
            <a
              key={video.id}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative rounded-2xl overflow-hidden shadow-md group"
              style={{ aspectRatio: '9/16' }}
            >
              <img
                src={video.cover}
                alt="Instagram Reels"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-end justify-between p-3">
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                  <IgIcon />
                  Reels
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-4 py-2 rounded-full transition-all self-center">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                  İzle
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};

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
  
  const prevIndex = (activeTestimonial - 1 + testimonials.length) % testimonials.length;
  const nextIndex = (activeTestimonial + 1) % testimonials.length;

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
      <SEO
        description="Fullematematiği ile online matematik özel dersi alın. LGS, YKS, KPSS ve okul matematiği için uzman eğitim. Hemen kayıt olun!"
        path="/"
      />
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
                Matematiği Full&apos;e, <span className="text-primary">Hedeflerine Ulaş!</span>
              </h1>
              <p className="text-lg leading-relaxed text-slate-600">
                Uzman eğitmen kadromuz, kişiye özel çalışma planı, düzenli takip sistemi ve soru çözüm desteğiyle matematiği kolaylaştırıyor, hedef puanına birlikte ulaşıyoruz.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <button onClick={scrollToForm} className="flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105 cursor-pointer">
                  Ücretsiz İlk Dersine Katıl
                </button>
                <Link to="/derslerimiz" className="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-slate-300 bg-white px-8 text-lg font-bold text-slate-700 hover:border-primary/40 hover:text-primary transition-all">
                  Eğitim Sistemimizi Keşfet
                </Link>
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
              <p className="text-4xl font-black">10.000+</p>
              <p className="text-sm font-medium opacity-80">Öğrenci</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">5000+</p>
              <p className="text-sm font-medium opacity-80">Saat Canlı Ders</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">%95</p>
              <p className="text-sm font-medium opacity-80">Öğrenci Memnuniyeti</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">7</p>
              <p className="text-sm font-medium opacity-80">Farklı Sınava Hazırlık</p>
            </div>
          </div>
          <p className="text-center text-xs font-medium opacity-50 mt-8 tracking-widest uppercase">
            TYT • AYT • KPSS • DGS • ALES • LGS
          </p>
        </section>

        {/* Features Section with Clean Video Background & Smooth White Edge Fades */}
        <section className="relative overflow-hidden bg-white py-20 lg:py-28 my-8" id="ozellikler">
          {/* Native Video Background (No Color Overlay) */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="h-full w-full object-cover"
            >
              <source src="/math-bg.mp4" type="video/mp4" />
              <source src="/math-background.mp4" type="video/mp4" />
              <source src="/math-background.mov" type="video/quicktime" />
            </video>

            {/* Smooth White Gradient Fade - Top */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none" />

            {/* Smooth White Gradient Fade - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mb-16 flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-primary mb-4 backdrop-blur-md shadow-sm">
                ✨ Fullematematiği Farkı
              </span>
              <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl drop-shadow-sm">
                Neden Fullematematiği?
              </h2>
              <p className="max-w-2xl text-base md:text-lg text-slate-700 font-semibold leading-relaxed drop-shadow-sm">
                Geleneksel eğitim metodlarını bir kenara bırakın. Teknoloji ve uzmanlığın birleştiği noktada en verimli öğrenme deneyimini yaşayın.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Card 1 */}
              <div className="group relative flex flex-col gap-5 rounded-3xl border border-slate-200/90 bg-white/90 p-8 backdrop-blur-md shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-white hover:shadow-2xl hover:shadow-primary/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-3xl">video_camera_front</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Canlı Dersler</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Haftalık belirlenen saatlerde interaktif sınıflarda hocalarımıza anında soru sorma ve konu tekrarı yapma imkanı.
                </p>
              </div>

              {/* Card 2 */}
              <div className="group relative flex flex-col gap-5 rounded-3xl border border-slate-200/90 bg-white/90 p-8 backdrop-blur-md shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-white hover:shadow-2xl hover:shadow-primary/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-3xl">person_search</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Birebir Takip</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Her öğrenciye atanan eğitim koçu ile gelişiminiz adım adım izlenir, zayıf noktalarınıza özel çalışma programı hazırlanır.
                </p>
              </div>

              {/* Card 3 */}
              <div className="group relative flex flex-col gap-5 rounded-3xl border border-slate-200/90 bg-white/90 p-8 backdrop-blur-md shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-white hover:shadow-2xl hover:shadow-primary/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-3xl">play_circle</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Soru Çözüm Videoları</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Binlerce sorunun detaylı, püf noktalarıyla anlatıldığı video kütüphanemize 7/24 sınırsız erişim sağlayın.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10" id="urunlerimiz">
          <div className="mb-16 flex flex-col items-center text-center">
            <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Sınavlara Hazırlıkta En Çok Tercih Edilen Notlar</h2>
            <p className="max-w-2xl text-lg text-slate-600">
              Konu özetleri, çözümlü örnekler, çıkmış sorular ve pratik yöntemlerle matematiği daha hızlı öğren.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-8">
            {[
              { id: 1, name: 'DGS MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '350 TL', image: '/IMG_2943.jpeg' },
              { id: 2, name: 'YKS / AYT MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '350 TL', image: '/IMG_2943.jpeg' },
              { id: 3, name: 'KPSS MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '350 TL', image: '/IMG_2943.jpeg' },
              { id: 4, name: 'LGS MATEMATİK Tüm Konular Çözümlü Ders Notları (FulleMatematigi Özel PDF)', price: '150 TL', image: '/IMG_2943.jpeg' }
            ].map((product) => (
              <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white transition-all hover:shadow-xl">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <div className="flex flex-col gap-2 p-3 sm:p-6">
                  <h3 className="text-sm font-bold text-slate-900 sm:text-base">{product.name}</h3>
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

        {/* Social Media Feed */}
        <SocialFeed />

        {/* Testimonials Section */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-16 border-t border-slate-100" id="referanslar">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1 text-xs font-black uppercase tracking-wider text-primary">
                Görüşleriniz
              </span>
              <h2 className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">
                Aldığımız Geri Dönüşler
              </h2>
              <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
                Birlikte çalıştığımız öğrencilerin ve destek olduğumuz velilerimizin başarı hikayeleri ve samimi yorumları.
              </p>
            </div>

            <div className="relative mx-auto max-w-4xl">
              {/* Carousel Track: 3 cards on desktop, 1 on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Left Faded Card */}
                <div 
                  onClick={() => handleSlideChange(prevIndex)}
                  className="hidden md:flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-100 shadow-md opacity-35 scale-90 transition-all duration-500 cursor-pointer hover:opacity-60 min-h-[190px]"
                >
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">
                        {testimonials[prevIndex].name}
                      </h4>
                      <div className="flex gap-0.5 text-amber-500/60">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined fill-1 text-xs">star</span>
                        ))}
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500 font-medium italic line-clamp-3">
                      "{testimonials[prevIndex].content}"
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-50">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {testimonials[prevIndex].grade}
                    </span>
                  </div>
                </div>

                {/* Center Highlighted Card */}
                <div className={`flex flex-col justify-between p-6 rounded-3xl bg-white border-2 border-primary/20 shadow-xl scale-100 md:scale-105 z-10 transition-all duration-300 min-h-[220px] relative ${fade ? 'opacity-100' : 'opacity-80'}`}>
                  {/* Decorative Quote Icon in background */}
                  <span className="absolute right-4 top-2 text-slate-100 font-serif text-[70px] leading-none pointer-events-none select-none">
                    ”
                  </span>
                  
                  <div className="relative z-10 flex flex-col gap-4 h-full justify-between flex-1">
                    <div>
                      {/* Header: Name and Stars */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
                        <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                          {testimonials[activeTestimonial].name}
                        </h4>
                        <div className="flex gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="material-symbols-outlined fill-1 text-base">star</span>
                          ))}
                        </div>
                      </div>

                      {/* Content: Testimonial Message */}
                      <p className="mt-4 text-xs md:text-sm leading-relaxed text-slate-700 font-medium italic">
                        "{testimonials[activeTestimonial].content}"
                      </p>
                    </div>

                    {/* Footer: Grade/Class & Navigation */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
                        <span className="material-symbols-outlined text-[10px]">school</span>
                        {testimonials[activeTestimonial].grade}
                      </span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSlideChange(prevIndex); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                          aria-label="Önceki yorum"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleSlideChange(nextIndex); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                          aria-label="Sonraki yorum"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Faded Card */}
                <div 
                  onClick={() => handleSlideChange(nextIndex)}
                  className="hidden md:flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-100 shadow-md opacity-35 scale-90 transition-all duration-500 cursor-pointer hover:opacity-60 min-h-[190px]"
                >
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">
                        {testimonials[nextIndex].name}
                      </h4>
                      <div className="flex gap-0.5 text-amber-500/60">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined fill-1 text-xs">star</span>
                        ))}
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500 font-medium italic line-clamp-3">
                      "{testimonials[nextIndex].content}"
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-50">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {testimonials[nextIndex].grade}
                    </span>
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
                <img src="/logo.png" alt="Fullematematiği Logo" className="h-10 w-10 object-contain" />
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
                <li><Link className="hover:text-primary transition-colors" to="/kvkk">KVKK</Link></li>
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
