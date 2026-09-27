import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const YT_CHANNEL_URL = 'https://www.youtube.com/@matematiginsahii';
const IG_URL = 'https://www.instagram.com/matematiginsahi';

const IgIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
);

const YtIcon = ({ size = 4 }) => (
  <svg viewBox="0 0 24 24" className={`w-${size} h-${size} fill-current`}><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
);

const SHOWCASE_VIDEOS = [
  { id: 'ig1', type: 'instagram', url: 'https://www.instagram.com/reel/Ddt22FLI1YF/', cover: '/IMG_4357.jpeg' },
  { id: 'yt1', type: 'youtube', videoId: 'RH2-2Ulem-A', url: 'https://www.youtube.com/shorts/RH2-2Ulem-A' },
  { id: 'ig2', type: 'instagram', url: 'https://www.instagram.com/reel/DdEoFl2oroC/', cover: '/IMG_4357.jpeg' },
  { id: 'yt2', type: 'youtube', videoId: 'ZNeOFQ2_11s', url: 'https://www.youtube.com/shorts/ZNeOFQ2_11s' },
  { id: 'ig3', type: 'instagram', url: 'https://www.instagram.com/reel/DdjiLWNomit/', cover: '/IMG_4357.jpeg' },
];

const SocialFeed = () => {
  const [playing, setPlaying] = useState(null);

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10" id="sosyal-medya">
      <div className="mb-10 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-4 py-1 text-xs font-black uppercase tracking-wider text-primary mb-3">
          📱 Sosyal Medyada Biz
        </span>
        <h2 className="text-2xl font-black text-slate-900 md:text-3xl mb-2">Matematik Taktikleri & Pratik Çözümler</h2>
        <p className="text-sm text-slate-600 max-w-lg mb-6">
          Sınavlarda net artıran hap bilgiler, formül analizleri ve özel soru çözümleri için bizi takip edin.
        </p>
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
      name: "Sevgi K.",
      content: "Hocam iyi akşamlar, oğlum LGS yeni nesil soruları görünce eli ayağına dolaşıyordu, tamamen pes etmişti. Sizin sabırlı yaklaşımınız ve soruya nereden başlanacağını öğretmeniz sayesinde son denemede 19 doğru yaptı! Bize her hafta verdiğiniz düzenli gelişim raporları da içimizi çok rahatlattı. Emeğinize sağlık.",
      grade: "LGS 8. Sınıf Velimiz"
    },
    {
      name: "Murat T.",
      content: "Burak Hocam merhaba, kızımızın AYT matematikte yaşadığı stres ve özgüven kaybı sizinle derslere başladıktan sonra yerini kararlılığa bıraktı. 12-14 netlerden 32 net bandına kadar yükseldi. Sadece ders anlatmıyor, sınav koçluğunu da çok profesyonel yapıyorsunuz. İyi ki varsınız.",
      grade: "12. Sınıf (YKS) Velimiz"
    },
    {
      name: "Zeynep A.",
      content: "LGS'den sonra lise 1 matematiği kızımı çok korkutmuştu, ilk yazılıdan 42 alınca çok üzüldük. Sizinle tanıştıktan sonra ikinci sınav notumuz 94 geldi! Şimdiye kadar 'matematikten keyif alıyorum' dediğini hiç duymamıştık. Çocuğuma bu sevgiyi aşıladığınız için çok teşekkürler hocam.",
      grade: "9. Sınıf Velimiz"
    },
    {
      name: "Hakan D.",
      content: "Açıkçası online ders konusunda ilk başta önyargılıydım ama canlı derslerdeki interaktif tahta ve ders takibi yüz yüze özel dersten çok daha verimli oldu. Oğlum özellikle analitik geometride artık hiç zorlanmıyor. İlginiz ve enerjiniz için ailecek minnettarız.",
      grade: "11. Sınıf Velimiz"
    },
    {
      name: "Fatma B.",
      content: "Burak Hocam günaydın. Ders sonrası gönderdiğiniz ödev kontrolleri ve öğrenci portalındaki sisteminiz harika işliyor. Artık ders çalış diye arkasından koşmuyoruz, kendi sorumluluğunu kendisi alıyor. Netlerimizdeki düzenli artış için çok teşekkür ederiz.",
      grade: "8. Sınıf Velimiz"
    },
    {
      name: "Ahmet E.",
      content: "Fen lisesi müfredatında oğluma rehberlik edecek seviyede öğretmen bulmakta zorlanıyorduk. Burak Hoca'nın derin konu hakimiyeti ve yeni nesil zor sorulara pratik yaklaşımları sayesinde matematik okul birinciliği seviyesine geldi. Teşekkürler Hocam.",
      grade: "Fen Lisesi Velimiz"
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




  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://matematikinsahi.com/#organization',
        'name': 'Matematiğin Şahı',
        'url': 'https://matematikinsahi.com',
        'logo': 'https://matematikinsahi.com/logo.png',
        'description': 'Türkiye\'nin lider online matematik canlı ders ve geometri özel ders platformu Matematiğin Şahı. YKS, LGS ve KPSS eğitimleri.',
        'telephone': '+90-535-059-8950',
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '5',
          'reviewCount': '6',
          'bestRating': '5'
        },
        'review': [
          {
            '@type': 'Review',
            'author': { '@type': 'Person', 'name': 'Sevgi K. (LGS 8. Sınıf Velisi)' },
            'reviewRating': { '@type': 'Rating', 'ratingValue': '5' },
            'reviewBody': 'Hocam iyi akşamlar, oğlum LGS yeni nesil soruları görünce eli ayağına dolaşıyordu, tamamen pes etmişti. Sizin sabırlı yaklaşımınız ve soruya nereden başlanacağını öğretmeniz sayesinde son denemede 19 doğru yaptı! Bize her hafta verdiğiniz düzenli gelişim raporları da içimizi çok rahatlattı. Emeğinize sağlık.'
          },
          {
            '@type': 'Review',
            'author': { '@type': 'Person', 'name': 'Murat T. (12. Sınıf YKS Velisi)' },
            'reviewRating': { '@type': 'Rating', 'ratingValue': '5' },
            'reviewBody': 'Burak Hocam merhaba, kızımızın AYT matematikte yaşadığı stres ve özgüven kaybı sizinle derslere başladıktan sonra yerini kararlılığa bıraktı. 12-14 netlerden 32 net bandına kadar yükseldi. Sadece ders anlatmıyor, sınav koçluğunu da çok profesyonel yapıyorsunuz. İyi ki varsınız.'
          },
          {
            '@type': 'Review',
            'author': { '@type': 'Person', 'name': 'Zeynep A. (9. Sınıf Velisi)' },
            'reviewRating': { '@type': 'Rating', 'ratingValue': '5' },
            'reviewBody': 'LGS\'den sonra lise 1 matematiği kızımı çok korkutmuştu, ilk yazılıdan 42 alınca çok üzüldük. Sizinle tanıştıktan sonra ikinci sınav notumuz 94 geldi! Şimdiye kadar \'matematikten keyif alıyorum\' dediğini hiç duymamıştık. Çocuğuma bu sevgiyi aşıladığınız için çok teşekkürler hocam.'
          },
          {
            '@type': 'Review',
            'author': { '@type': 'Person', 'name': 'Hakan D. (11. Sınıf Velisi)' },
            'reviewRating': { '@type': 'Rating', 'ratingValue': '5' },
            'reviewBody': 'Açıkçası online ders konusunda ilk başta önyargılıydım ama canlı derslerdeki interaktif tahta ve ders takibi yüz yüze özel dersten çok daha verimli oldu. Oğlum özellikle analitik geometride artık hiç zorlanmıyor. İlginiz ve enerjiniz için ailecek minnettarız.'
          },
          {
            '@type': 'Review',
            'author': { '@type': 'Person', 'name': 'Fatma B. (8. Sınıf Velisi)' },
            'reviewRating': { '@type': 'Rating', 'ratingValue': '5' },
            'reviewBody': 'Burak Hocam günaydın. Ders sonrası gönderdiğiniz ödev kontrolleri ve öğrenci portalındaki sisteminiz harika işliyor. Artık ders çalış diye arkasından koşmuyoruz, kendi sorumluluğunu kendisi alıyor. Netlerimizdeki düzenli artış için çok teşekkür ederiz.'
          },
          {
            '@type': 'Review',
            'author': { '@type': 'Person', 'name': 'Ahmet E. (Fen Lisesi Velisi)' },
            'reviewRating': { '@type': 'Rating', 'ratingValue': '5' },
            'reviewBody': 'Fen lisesi müfredatında oğluma rehberlik edecek seviyede öğretmen bulmakta zorlanıyorduk. Burak Hoca\'nın derin konu hakimiyeti ve yeni nesil zor sorulara pratik yaklaşımları sayesinde matematik okul birinciliği seviyesine geldi. Teşekkürler Hocam.'
          }
        ]
      },
      {
        '@type': 'Service',
        '@id': 'https://matematikinsahi.com/#service-math-tutoring',
        'name': 'Matematiğin Şahı Online Matematik ve Geometri Özel Ders',
        'serviceType': 'Online Education & Tutoring',
        'provider': {
          '@type': 'EducationalOrganization',
          'name': 'Matematiğin Şahı'
        }
      }
    ]
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white">
      <SEO
        title="KPSS, LGS, TYT, AYT Matematik Online Ders & Özel Ders"
        description="KPSS online ders, LGS online ders, TYT ve AYT matematik online özel ders platformu Matematiğin Şahı ile sınavlara derece hedefiyle hazırlanın."
        path="/"
        keywords="kpss online ders, lgs online ders, tyt online ders, ayt online ders, kpss matematik online ders, lgs matematik online ders, tyt matematik online ders, ayt matematik online ders, matematik online özel ders, Matematiğin Şahı"
        schemaData={homeSchema}
      />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-20" id="ana-sayfa">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            
            {/* Left Content Column (7 cols) */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs sm:text-sm font-bold text-primary shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                <span>YKS • LGS • KPSS & Maarif Modeli Canlı Eğitimleri</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.12] tracking-tight text-slate-900">
                Matematikte Zirveye Ulaş:{' '}
                <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent">
                  Canlı & İnteraktif
                </span>{' '}
                Özel Dersler
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl">
                Matematik ön yargılarını geride bırakın! Kişiye özel seviye analizi, butik canlı sınıflar, birebir takip ve sınırsız ders kaydı arşiviyle sınav hedeflerinize emin adımlarla ilerleyin. Temelden dereceye, her seviyeye özel başarı odaklı eğitim.
              </p>

              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center pt-2">
                <Link
                  to="/kontenjan-dersleri"
                  className="flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base sm:text-lg font-bold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>Kontenjan Derslerini İncele</span>
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </Link>
                <a
                  href="https://www.instagram.com/reel/Ddt22FLI1YF/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-7 text-base font-bold text-slate-700 hover:border-primary/40 hover:text-primary transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-primary text-xl">play_circle</span>
                  <span>Ders Anlatımını İzle</span>
                </a>
              </div>

              {/* Trust Micro-Badges */}
              <div className="flex items-center gap-6 pt-3 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                  <span>Butik Canlı Sınıflar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                  <span>7/24 Kayıt Erişimi</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                  <span>Çözümlü PDF Kaynakları</span>
                </div>
              </div>
            </div>

            {/* Right Graphic Column: Interactive Live Classroom UI Mockup (5 cols) */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:col-span-5">
              {/* Ambient Glows */}
              <div className="absolute -top-10 -left-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -right-8 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
              
              {/* Main Interactive Classroom Card */}
              <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-6 text-white shadow-2xl shadow-slate-900/30 backdrop-blur-xl">
                
                {/* Top Window Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80"></div>
                    <span className="ml-2 text-xs font-mono text-slate-400">canli-derslik.live</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      CANLI YAYIN
                    </span>
                  </div>
                </div>

                {/* Interactive Board Area */}
                <div className="mt-4 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 sm:p-5 relative overflow-hidden">
                  {/* Subtle coordinate grid lines pattern */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                  
                  {/* Studio Header */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/40 text-primary font-black text-sm">
                        MŞ
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">Matematiğin Şahı Canlı Stüdyo</p>
                        <p className="text-[10px] text-slate-400">İnteraktif Soru Çözümü & Analiz</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      HD 1080p
                    </span>
                  </div>

                  {/* Math Visual & Formula Presentation */}
                  <div className="my-4 rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 relative z-10">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
                      <span className="text-primary font-bold">Örnek Soru & Pratik Kural</span>
                      <span className="font-mono text-[11px] text-emerald-400">Net Kazandıran Taktik</span>
                    </div>

                    {/* Math Equation & Diagram Mockup */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-amber-300">
                          f(x) = ax² + bx + c
                        </span>
                        <span className="text-xs text-slate-400">→</span>
                        <span className="rounded bg-primary/20 border border-primary/40 px-2 py-0.5 font-mono text-xs text-orange-200 font-bold">
                          T(r, k) = (-b / 2a, f(r))
                        </span>
                      </div>

                      {/* Parabola Graphic Curve */}
                      <div className="h-16 w-full rounded-lg bg-slate-950/60 border border-slate-800/80 p-2 flex items-center justify-center relative overflow-hidden">
                        <svg className="w-full h-full text-primary" viewBox="0 0 300 60" fill="none">
                          <line x1="10" y1="50" x2="290" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="150" y1="5" x2="150" y2="55" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                          <path d="M 40 48 Q 150 -5 260 48" stroke="#FF7A00" strokeWidth="2.5" fill="none" />
                          <circle cx="150" cy="20" r="4" fill="#38BDF8" />
                          <text x="160" y="22" fill="#38BDF8" fontSize="10" fontWeight="bold">Tepe Noktası T(r,k)</text>
                        </svg>
                      </div>
                    </div>

                    {/* Student Interaction Line */}
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] text-emerald-300">
                      <span className="material-symbols-outlined text-xs">forum</span>
                      <span>Öğrenci: <i>"Hocam bu taktikle soru saniyeler içinde çözülüyor!"</i></span>
                    </div>
                  </div>

                  {/* Audio / Control wave indicator */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-emerald-400">mic</span>
                      <div className="flex items-center gap-1">
                        <span className="h-3 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="h-4 w-1 rounded-full bg-emerald-400 animate-pulse delay-75"></span>
                        <span className="h-2 w-1 rounded-full bg-emerald-400 animate-pulse delay-150"></span>
                        <span className="h-5 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="h-3 w-1 rounded-full bg-emerald-400 animate-pulse delay-100"></span>
                      </div>
                      <span className="text-[11px] text-slate-300 ml-1">Ses ve Görüntü Açık</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="material-symbols-outlined text-xs text-primary">groups</span>
                      <span>Butik Sınıf: 7 Öğrenci</span>
                    </div>
                  </div>
                </div>

                {/* Floating Badges */}
                {/* Top-Right Badge: Net Artışı */}
                <div className="absolute -top-4 -right-2 sm:-right-4 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 sm:p-3 text-slate-900 shadow-xl border border-slate-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 font-black">
                    <span className="material-symbols-outlined text-lg">trending_up</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">+16 Net Artışı</p>
                    <p className="text-[10px] font-semibold text-slate-500">5 Netten 21 Nete Zirve</p>
                  </div>
                </div>

                {/* Bottom-Left Badge: Memnuniyet */}
                <div className="absolute -bottom-4 -left-2 sm:-left-4 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 sm:p-3 text-slate-900 shadow-xl border border-slate-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 font-black">
                    <span className="material-symbols-outlined text-lg">verified</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-slate-900">%98.4 Memnuniyet</span>
                      <div className="flex text-amber-500">
                        <span className="material-symbols-outlined fill-1 text-[11px]">star</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500">Öğrenci & Veli Onaylı</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>


        {/* Stats Section */}
        <section className="bg-gradient-to-r from-primary via-orange-600 to-primary px-6 py-14 text-white shadow-inner">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-black tracking-tight">10.000+</p>
              <p className="text-xs sm:text-sm font-semibold opacity-90 mt-1">Ders Alan Öğrenci</p>
            </div>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-black tracking-tight">5.000+</p>
              <p className="text-xs sm:text-sm font-semibold opacity-90 mt-1">Saat Canlı Ders & Soru Çözümü</p>
            </div>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-black tracking-tight">%98</p>
              <p className="text-xs sm:text-sm font-semibold opacity-90 mt-1">Öğrenci & Veli Memnuniyeti</p>
            </div>
            <div className="text-center">
              <p className="text-4xl sm:text-5xl font-black tracking-tight">+16 Net</p>
              <p className="text-xs sm:text-sm font-semibold opacity-90 mt-1">Ortalama Başarı Artışı</p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/20 text-center">
            <p className="text-xs sm:text-sm font-bold tracking-widest uppercase opacity-90">
              TYT • AYT • LGS 2027 • KPSS • DGS • YENİ MAARİF MÜFREDATI
            </p>
          </div>
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
              <source src="/gemini_generated_video_78A3F1F4.mp4" type="video/mp4" />
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
                ✨ Matematiğin Şahı Farkı
              </span>
              <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl drop-shadow-sm">
                Ezber Bozan Matematik Eğitimi
              </h2>
              <p className="max-w-2xl text-base md:text-lg text-slate-700 font-semibold leading-relaxed drop-shadow-sm">
                Formülleri ezberleten klasik yöntemler yerine; matematiğin mantığını kavratan, problem çözme refleksi kazandıran ve sınavlarda derece hedefleyen modern eğitim modeli.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Card 1 */}
              <div className="group relative flex flex-col gap-5 rounded-3xl border border-slate-200/90 bg-white/95 p-8 backdrop-blur-md shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-white hover:shadow-2xl hover:shadow-primary/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-3xl">video_camera_front</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">İnteraktif Canlı Dersler</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Pasif video izlemek yerine; hocanızla anında konuşabildiğiniz, soru sorabildiğiniz ve tahtada interaktif çözüm yaptığınız butik canlı sınıflar.
                </p>
              </div>

              {/* Card 2 */}
              <div className="group relative flex flex-col gap-5 rounded-3xl border border-slate-200/90 bg-white/95 p-8 backdrop-blur-md shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-white hover:shadow-2xl hover:shadow-primary/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-3xl">person_search</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Birebir Takip & Koçluk</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  Her öğrencinin eksikleri farklıdır. Seviye tespit sınavı, kişiye özel haftalık çalışma planı ve düzenli deneme analizleriyle gelişiminiz adım adım izlenir.
                </p>
              </div>

              {/* Card 3 */}
              <div className="group relative flex flex-col gap-5 rounded-3xl border border-slate-200/90 bg-white/95 p-8 backdrop-blur-md shadow-xl shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 hover:bg-white hover:shadow-2xl hover:shadow-primary/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-3xl">play_circle</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">7/24 Kayıt & Soru Çözüm Arşivi</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  İşlenen tüm canlı derslerin kayıtlarına ve ders esnasında tutulan el yazısı çözümlü PDF kaynaklarına dilediğiniz an sınırsız erişin.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* Social Media Feed */}
        <SocialFeed />

        {/* Testimonials Section */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-20 border-t border-slate-100" id="referanslar">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-4 py-1 text-xs font-black uppercase tracking-wider text-primary">
                💬 Başarı Hikayeleri
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">
                Öğrenci & Veli Deneyimleri
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
                Birlikte hazırlandığımız öğrencilerimizin net artışları, sınav dereceleri ve velilerimizin memnuniyet mesajları.
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


      </main>

      {/* Footer */}
      <footer className="bg-white px-6 py-12 text-slate-600 border-t border-primary/10">
        <div className="mx-auto max-w-7xl lg:px-10">
          <div className="grid gap-12 border-b border-slate-100 pb-12 md:grid-cols-4">
            <div className="col-span-2 flex flex-col gap-6">
              <div className="flex items-center gap-3 text-slate-900">
                <img src="/logo.png" alt="Matematiğin Şahı Logo" className="h-10 w-10 object-contain" />
                <h2 className="text-xl font-bold tracking-tight">Matematiğin Şahı</h2>
              </div>
              <p className="max-w-md leading-relaxed text-sm">
                Türkiye'nin en interaktif matematik platformu olarak, öğrencilerin hedeflerine ulaşmasında en büyük destekçisiyiz. Kaliteli içerik ve uzman kadromuzla yanınızdayız.
              </p>
              <div className="flex gap-4">
                <a className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-primary hover:text-white" href="https://www.instagram.com/matematiginsahi" target="_blank" rel="noopener noreferrer" title="Instagram">
                  <span className="material-symbols-outlined">camera_alt</span>
                </a>
                <a className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-red-600 hover:text-white" href="https://www.youtube.com/@matematiginsahii" target="_blank" rel="noopener noreferrer" title="YouTube">
                  <YtIcon size={4} />
                </a>
              </div>
            </div>
            <div>
              <h3 className="mb-6 font-bold text-slate-900">Hızlı Linkler</h3>
              <ul className="flex flex-col gap-3 text-sm">
                <li><Link className="hover:text-primary transition-colors" to="/">Ana Sayfa</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/kontenjan-dersleri">Canlı Derslerimiz</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/pdf-notlari">PDF Ders Notları</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/blog">Blog</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/iletisim">İletişim</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-6 font-bold text-slate-900">Blog Yazıları</h3>
              <ul className="flex flex-col gap-3 text-sm">
                <li><Link className="hover:text-primary transition-colors" to="/blog/tyt-matematik-konulari">TYT Matematik Konuları</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/blog/lgs-matematik-konulari">LGS Matematik Konuları</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/blog/9-sinif-matematik-konulari">9. Sınıf Matematik Konuları</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/blog/tyt-matematik-soru-dagilimi">TYT Soru Dağılımı</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/blog/geometride-sekilleri-gormek-ve-geometri-taktikleri">Geometri Taktikleri</Link></li>
                <li><Link className="hover:text-primary transition-colors" to="/kvkk">KVKK Aydınlatma Metni</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-6 pt-12 md:flex-row">
            <p className="text-sm">© 2026 Matematiğin Şahı. Tüm hakları saklıdır.</p>
            <div className="flex gap-8 text-sm">
              <Link className="hover:text-primary transition-colors" to="/kvkk">Gizlilik & KVKK</Link>
              <Link className="hover:text-primary transition-colors" to="/iletisim">İletişim</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
