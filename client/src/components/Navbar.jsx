import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-x-hidden border-b border-primary/10 bg-white/80 backdrop-blur-md dark:bg-background-dark/80">
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
                className="flex items-center justify-center rounded-full bg-primary px-3 py-1.5 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 whitespace-nowrap"
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

      {/* Sub Orange Banner Bar */}
      <div className="bg-primary text-white py-1.5 px-2 sm:px-6 shadow-sm border-t border-white/10 text-[10px] sm:text-xs font-bold w-full max-w-full overflow-hidden">
        <div className="mx-auto flex items-center justify-center max-w-7xl">
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap w-full py-0.5">
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
              LGS 2027
            </span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
              YKS 2027
            </span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
              KPSS 2027
            </span>
            <div className="flex items-center gap-1.5 whitespace-nowrap px-1">
              <span className="font-['Caveat',cursive] text-sm sm:text-lg font-bold text-white leading-none">maarif</span>
              <span className="font-extrabold tracking-widest text-[9px] sm:text-[10px] uppercase text-white/90">MODELİ</span>
            </div>
            <Link
              to="/pdf-notlari"
              className="bg-white/25 hover:bg-white/35 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap flex items-center gap-1 text-white transition-all hover:scale-105"
            >
              <span className="material-symbols-outlined text-[12px] sm:text-[14px]">description</span>
              <span>PDF Notlar</span>
            </Link>

            {/* YouTube & Instagram Logoları (PDF Notların Hemen Sağında) */}
            <div className="flex items-center gap-1.5 ml-1 flex-shrink-0">
              {/* YouTube */}
              <a
                href="https://www.youtube.com/@FULLEMATEMAT%C4%B0G%C4%B0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110"
                aria-label="YouTube"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a
                href="https://www.instagram.com/fullematematigi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-110"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
