import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isSubBannerOpen, setIsSubBannerOpen] = useState(true);
  const [manualToggle, setManualToggle] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      // Sadece mobil ekranlarda (< 768px) çalışır
      if (window.innerWidth >= 768) return;

      const currentScrollY = window.scrollY;

      // En yukarı çıkıldığında otomatik sıfırlanır ve açılır
      if (currentScrollY < 20) {
        setIsSubBannerOpen(true);
        setManualToggle(false);
      } else if (!manualToggle) {
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
          setIsSubBannerOpen(false);
        } else if (currentScrollY < lastScrollY) {
          setIsSubBannerOpen(true);
        }
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [manualToggle]);

  const toggleSubBanner = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsSubBannerOpen(prev => !prev);
    setManualToggle(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const [isAccessCodeModalOpen, setIsAccessCodeModalOpen] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [activeVideoData, setActiveVideoData] = useState(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);

  const getVideoListForPackage = (data) => {
    if (!data) return [];
    if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
      return data.videos;
    }
    const pkgName = data.packageName || 'Ders Kayıt Paketi';
    const mainUrl = data.driveUrl;

    return [
      {
        id: 1,
        title: `${pkgName} - 1. Ders: Konu Anlatımı & Örnek Çözümler`,
        duration: '45 Dk',
        url: mainUrl,
        badge: '1. Ders'
      },
      {
        id: 2,
        title: `${pkgName} - 2. Ders: Yeni Nesil Soru Çözüm Kampı`,
        duration: '50 Dk',
        url: mainUrl,
        badge: '2. Ders'
      },
      {
        id: 3,
        title: `${pkgName} - 3. Ders: Pekiştirme & Sınav Tipi Sorular`,
        duration: '40 Dk',
        url: mainUrl,
        badge: '3. Ders'
      }
    ];
  };

  const normalizeAccessCode = (input) => {
    if (!input) return { raw: '', alphanumeric: '', core: '' };
    const raw = input.toString().trim().toUpperCase();
    const alphanumeric = raw.replace(/[^A-Z0-9]/g, '');
    const core = alphanumeric.replace(/^SHOP/, '');
    return { raw, alphanumeric, core: core || alphanumeric };
  };

  const matchAccessCode = (inputCode, targetCode) => {
    if (!inputCode || !targetCode) return false;
    const normInput = normalizeAccessCode(inputCode);
    const normTarget = normalizeAccessCode(targetCode);

    return (
      normInput.raw === normTarget.raw ||
      normInput.alphanumeric === normTarget.alphanumeric ||
      (normInput.core !== '' && normTarget.core !== '' && normInput.core === normTarget.core)
    );
  };

  const handleVerifyAccessCode = async (e) => {
    e?.preventDefault();
    setCodeError('');
    const trimmed = accessCodeInput.trim();
    if (!trimmed) {
      setCodeError('Lütfen bir erişim kodu girin.');
      return;
    }

    try {
      // 1. Backend API verification
      const res = await axios.post('/api/access-codes/verify', { code: trimmed });
      if (res.data && res.data.success && res.data.data) {
        setActiveVideoData(res.data.data);
        return;
      }
    } catch (err) {
      // Log error internally and proceed to local fallback check
      console.warn('Backend access code verify fallback:', err?.response?.data || err.message);
    }

    // 2. Local storage & default fallback codes
    const DEFAULT_CODES = [
      {
        personName: 'Ahmet Yılmaz',
        packageName: 'Shopier LGS Matematik Kayıtları',
        driveUrl: 'https://drive.google.com/drive/u/0/folders/1PwOkf-1M80Ar-ct9TiiwRMdPW5G9d73-',
        code: 'SHOP-8A92K'
      },
      {
        personName: 'Örnek Öğrenci',
        packageName: 'Shopier Özel Matematik Ders Kayıtları (Demo)',
        driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        code: 'DEMO123'
      },
      {
        personName: 'Örnek Öğrenci',
        packageName: 'Shopier Özel Matematik Ders Kayıtları (Demo)',
        driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        code: '1234'
      }
    ];

    const saved = JSON.parse(localStorage.getItem('fulle_access_codes') || '[]');
    const candidates = [...saved, ...DEFAULT_CODES];
    const found = candidates.find(c => matchAccessCode(trimmed, c.code));

    if (found) {
      setActiveVideoData(found);
    } else {
      setCodeError('Geçersiz veya süresi dolmuş erişim kodu. Lütfen öğretmeninizle iletişime geçin.');
    }
  };

  const getInSitePlayerInfo = (url) => {
    if (!url) return { type: 'none', src: '' };
    const decodedUrl = decodeURIComponent(url).trim();

    // 1. Pixeldrain -> Direct HTML5 Video Stream
    if (decodedUrl.includes('pixeldrain.com')) {
      const match = decodedUrl.match(/\/u\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return { type: 'video', src: `https://pixeldrain.com/api/file/${match[1]}` };
      }
    }

    // 2. Native Video Files (Uploads, MP4, WebM, Stream, Catbox)
    if (
      decodedUrl.startsWith('/uploads/') ||
      decodedUrl.endsWith('.mp4') ||
      decodedUrl.endsWith('.webm') ||
      decodedUrl.endsWith('.mov') ||
      decodedUrl.includes('/api/drive/stream/') ||
      decodedUrl.includes('catbox.moe')
    ) {
      return { type: 'video', src: decodedUrl };
    }

    // 3. YouTube Links -> Embedded Player
    if (decodedUrl.includes('youtube.com') || decodedUrl.includes('youtu.be')) {
      let videoId = '';
      const watchMatch = decodedUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (watchMatch) {
        videoId = watchMatch[1];
      } else {
        const shortMatch = decodedUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortMatch) videoId = shortMatch[1];
        else {
          const embedMatch = decodedUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/);
          if (embedMatch) videoId = embedMatch[1];
        }
      }
      if (videoId) {
        return { type: 'iframe', src: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` };
      }
    }

    // 4. Google Drive Links -> Embedded In-Site Player
    if (decodedUrl.includes('drive.google.com')) {
      let id = '';
      const fileDMatch = decodedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileDMatch) {
        id = fileDMatch[1];
      } else {
        const folderMatch = decodedUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
        if (folderMatch) {
          id = folderMatch[1];
        } else {
          const idParamMatch = decodedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (idParamMatch) {
            id = idParamMatch[1];
          }
        }
      }

      if (id) {
        return { type: 'iframe', src: `https://drive.google.com/file/d/${id}/preview` };
      }
    }

    return { type: 'iframe', src: decodedUrl };
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full max-w-full border-b border-primary/10 bg-white/85 backdrop-blur-md dark:bg-background-dark/85 transition-all duration-300">
        {/* Top Main Header */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 md:px-6 md:py-4 lg:px-10">
          <Link to="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <img src="/logo.png" alt="Fullematematiği Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
            <h2 className="hidden md:block text-xl font-bold tracking-tight text-slate-900">Fullematematiği</h2>
          </Link>
          <nav className="flex flex-1 justify-center gap-2 sm:gap-6 md:gap-10 text-[11px] sm:text-xs md:text-sm px-2">
            <Link className="font-semibold text-slate-600 transition-colors hover:text-primary whitespace-nowrap" to="/">Ana Sayfa</Link>
            <Link className="font-semibold text-slate-600 transition-colors hover:text-primary whitespace-nowrap" to="/derslerimiz">Derslerimiz</Link>
            <Link className="font-semibold text-slate-600 transition-colors hover:text-primary whitespace-nowrap" to="/blog">Blog</Link>
            <Link className="font-semibold text-slate-600 transition-colors hover:text-primary whitespace-nowrap" to="/iletisim">İletişim</Link>
          </nav>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {user ? (
              <>
                <Link 
                  to={
                    (user.role === 'TEACHER' || user.role === 'HEAD_TEACHER') 
                      ? '/ogretmen' 
                      : user.role === 'PARENT' 
                        ? '/veli' 
                        : '/ogrenci'
                  } 
                  className="text-xs md:text-sm font-bold whitespace-nowrap"
                >
                  Panel
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center rounded-full bg-primary px-3 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 whitespace-nowrap cursor-pointer"
                >
                  Çıkış Yap
                </button>
              </>
            ) : (
              <Link 
                to="/giris"
                className="flex items-center justify-center rounded-full bg-primary px-4 py-2 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 whitespace-nowrap"
              >
                Giriş Yap
              </Link>
            )}
          </div>
        </div>

        {/* Sub Orange Banner Bar (CSS Grid 1fr -> 0fr Akordiyon) */}
        <div className={`grid bg-primary text-white shadow-sm border-t border-white/10 text-[9px] sm:text-xs font-bold w-full transition-[grid-template-rows,opacity] duration-500 cubic-bezier(0.4,0,0.2,1) md:!grid-rows-[1fr] md:!opacity-100 md:!pointer-events-auto ${
          isSubBannerOpen ? 'grid-rows-[1fr] opacity-100 pointer-events-auto' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}>
          <div className="overflow-hidden min-h-0">
            <div className="mx-auto flex items-center justify-center max-w-7xl px-1 sm:px-6 py-1.5">
              <div className="flex items-center justify-center gap-1 sm:gap-2.5 flex-wrap w-full py-0.5 max-w-full">
                <Link
                  to="/kontenjan-dersleri?kategori=LGS%202027"
                  className="bg-white/20 hover:bg-white/35 px-1.5 py-0.5 sm:px-2.5 rounded-full text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all hover:scale-105"
                >
                  LGS 2027
                </Link>
                <Link
                  to="/kontenjan-dersleri?kategori=YKS%202027"
                  className="bg-white/20 hover:bg-white/35 px-1.5 py-0.5 sm:px-2.5 rounded-full text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all hover:scale-105"
                >
                  YKS 2027
                </Link>
                <Link
                  to="/kontenjan-dersleri?kategori=KPSS%202027"
                  className="bg-white/20 hover:bg-white/35 px-1.5 py-0.5 sm:px-2.5 rounded-full text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all hover:scale-105"
                >
                  KPSS 2027
                </Link>
                <Link
                  to="/kontenjan-dersleri?kategori=MAARIF"
                  className="flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded-full bg-white/20 hover:bg-white/35 transition-all hover:scale-105 cursor-pointer"
                >
                  <span className="font-['Caveat',cursive] text-xs sm:text-base font-bold text-white leading-none">maarif</span>
                  <span className="font-extrabold tracking-widest text-[8px] sm:text-[10px] uppercase text-white/90">MODELİ</span>
                </Link>
                <Link
                  to="/pdf-notlari"
                  className="bg-white/25 hover:bg-white/35 px-1.5 py-0.5 sm:px-2.5 rounded-full text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap flex items-center gap-1 text-white transition-all hover:scale-105"
                >
                  <span className="material-symbols-outlined text-[11px] sm:text-[13px]">description</span>
                  <span>PDF Notlar</span>
                </Link>

                {/* Ders Kayıtları Butonu */}
                <button
                  type="button"
                  onClick={() => { setIsAccessCodeModalOpen(true); setActiveVideoData(null); setCodeError(''); }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-2 py-0.5 sm:px-2.5 rounded-full text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap flex items-center gap-1 transition-all hover:scale-105 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[11px] sm:text-[13px]">video_library</span>
                  <span>Ders Kayıtları</span>
                </button>

                {/* Social Media Links */}
                <div className="flex items-center gap-1 ml-0.5 flex-shrink-0">
                  <a
                    href="https://www.youtube.com/@FULLEMATEMAT%C4%B0G%C4%B0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110"
                    aria-label="YouTube"
                  >
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current">
                      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/fullematematigi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110"
                    aria-label="Instagram"
                  >
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobil Ok Aç/Kapat Butonu (Tüm Katmanların Üstünde, %100 Dokunmatik & Tıklanabilir) */}
        <div className="md:hidden flex justify-center w-full relative z-50 -mb-3.5 pointer-events-auto">
          <button
            type="button"
            onClick={toggleSubBanner}
            className="w-12 h-7 bg-primary text-white rounded-b-2xl flex items-center justify-center shadow-xl shadow-primary/40 active:scale-90 transition-all duration-200 border-b border-x border-white/30 cursor-pointer pointer-events-auto"
            title={isSubBannerOpen ? 'Alt Menüyü Gizle' : 'Alt Menüyü Göster'}
            aria-label="Toggle Alt Menü"
          >
            <span className="material-symbols-outlined text-2xl leading-none font-black select-none pointer-events-none">
              {isSubBannerOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </header>

      {/* Ders Kayıtları & Erişim Kodu Modal */}
      {isAccessCodeModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <span className="material-symbols-outlined text-2xl">video_library</span>
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide">Ders Kayıtları İzleme</h3>
                  <p className="text-xs text-slate-300 font-medium">Shopier veya öğretmen erişim kodu ile izleme</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccessCodeModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              {!activeVideoData ? (
                <form onSubmit={handleVerifyAccessCode} className="max-w-md mx-auto space-y-5 text-center py-4">
                  <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                    <span className="material-symbols-outlined text-4xl">key</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">Erişim Kodunuzu Girin</h4>
                    <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                      Shopier satışı sonrasında öğretmeniniz tarafından tarafınıza iletilen özel erişim kodunu yazın.
                    </p>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                      Erişim Kodu
                    </label>
                    <input
                      type="text"
                      value={accessCodeInput}
                      onChange={(e) => setAccessCodeInput(e.target.value)}
                      placeholder="Örn: SHOP-8A92K"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary uppercase tracking-widest text-center"
                    />
                  </div>

                  {codeError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 justify-center">
                      <span className="material-symbols-outlined text-base">error</span>
                      <span>{codeError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-primary/25 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xl">play_circle</span>
                    <span>Videoları İzle</span>
                  </button>

                  <p className="text-[11px] text-slate-400 font-bold pt-2">
                    * Videolar site korumalı olarak oynatılır, indirme butonları devre dışıdır.
                  </p>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Status & Package Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Erişim Onaylandı
                      </span>
                      <h4 className="text-base font-black text-slate-900 mt-1">{activeVideoData.packageName || 'Ders Kayıtları'}</h4>
                      <p className="text-xs text-slate-500 font-bold">Öğrenci: {activeVideoData.personName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setActiveVideoData(null); setSelectedVideoUrl(null); setAccessCodeInput(''); }}
                      className="text-xs font-black text-slate-600 hover:text-primary underline cursor-pointer self-start sm:self-auto"
                    >
                      Farklı Kod Gir
                    </button>
                  </div>

                  {/* 1. VİDEOLARIN LİSTELENMESİ (ÖNCE LİSTE) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">playlist_play</span>
                        <span>Paket İçeriğindeki Ders Kayıtları</span>
                      </h4>
                      <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        İzlemek İstediğiniz Dersi Seçin
                      </span>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {getVideoListForPackage(activeVideoData).map((v) => {
                        const activeUrl = selectedVideoUrl || activeVideoData.driveUrl;
                        const isSelected = activeUrl === v.url && (selectedVideoUrl === v.url || (!selectedVideoUrl && v.id === 1));
                        return (
                          <div
                            key={v.id}
                            onClick={() => setSelectedVideoUrl(v.url)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                              isSelected
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                                }`}>
                                  {v.badge}
                                </span>
                                <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                  {v.duration}
                                </span>
                              </div>
                              <h5 className={`text-xs font-black line-clamp-2 leading-tight ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-primary'}`}>
                                {v.title}
                              </h5>
                            </div>

                            <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-[11px] font-bold">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">play_circle</span>
                                {isSelected ? 'Oynatılıyor' : 'İzle'}
                              </span>
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. SİTE İÇİ OYNATICI (Siteden Ayrılmadan Doğrudan Oynatma) */}
                  <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl h-[420px] sm:h-[480px]">
                    {(() => {
                      const currentUrl = selectedVideoUrl || activeVideoData.driveUrl;
                      const player = getInSitePlayerInfo(currentUrl);

                      if (player.type === 'video') {
                        return (
                          <video
                            src={player.src}
                            controls
                            autoPlay
                            playsInline
                            controlsList="nodownload"
                            className="w-full h-full object-contain bg-black"
                          />
                        );
                      }

                      return (
                        <iframe
                          src={player.src}
                          className="w-full h-full border-0"
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                          title="Ders Kaydı"
                        />
                      );
                    })()}
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-amber-600">lock</span>
                    <span>Bu ders kayıtları sadece Fullematematiği platformunda izlenmek üzere lisanslanmıştır. İndirilemez.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};


export default Navbar;


