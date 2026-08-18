import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const NotFound = () => {
  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-slate-50/50">
      <SEO
        title="Sayfa Bulunamadı (404)"
        description="Aradığınız sayfa kaldırılmış, adı değiştirilmiş veya geçici olarak kullanılamıyor olabilir."
        noindex={true}
      />
      <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-md flex flex-col items-center">
        <span className="material-symbols-outlined text-6xl text-primary mb-4">search_off</span>
        <h1 className="text-4xl font-black text-slate-900 mb-2">404</h1>
        <h2 className="text-lg font-bold text-slate-700 mb-3">Aradığınız Sayfa Bulunamadı</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          Ulaşmaya çalıştığınız adres mevcut değil veya taşınmış olabilir. Aşağıdaki bağlantıları kullanarak sitemize göz atabilirsiniz.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            to="/"
            className="flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md hover:bg-primary/95 transition-all"
          >
            Ana Sayfa
          </Link>
          <Link
            to="/blog"
            className="flex-1 inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            Matematik Rehberi
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
