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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Fulle Matematik Logo" className="h-10 w-10 object-contain" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Fulle Matematik</h2>
        </Link>
        <nav className="hidden flex-1 justify-center gap-10 md:flex">
          <Link className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary" to="/">Ana Sayfa</Link>
          <Link className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary" to="/hakkimizda">Hakkımızda</Link>
          <Link className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary" to="/iletisim">İletişim</Link>
        </nav>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link 
                to={user.role === 'TEACHER' ? '/ogretmen' : '/ogrenci'} 
                className="text-sm font-bold"
              >
                Panel
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/giris"
                className="flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
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
