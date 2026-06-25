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
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/80 backdrop-blur-md dark:bg-background-dark/80">
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
            <>
              <Link 
                to="/giris"
                className="flex items-center justify-center rounded-full bg-primary px-4 py-2 md:px-6 md:py-2.5 text-xs md:text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 whitespace-nowrap"
              >
                Giriş Yap
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
