import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BlogConversionDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConversionReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/teacher/blog-conversions');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching blog conversion report:', err);
      setError('Dönüşüm verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversionReport();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-bold gap-3">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
        <span>Blog Dönüşüm Raporu Yükleniyor...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 text-red-600">
        <p className="font-bold">{error || 'Veri bulunamadı.'}</p>
        <button
          onClick={fetchConversionReport}
          className="mt-4 px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  const { summary, topBlogs } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">trending_up</span>
            <span>Blog Dönüşüm Paneli</span>
          </h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            Google blog trafiğinden elde edilen potansiyel öğrenci & satış analizi
          </p>
        </div>
        <button
          onClick={fetchConversionReport}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Verileri Yenile
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase">CTA Gösterimi</span>
            <span className="material-symbols-outlined text-primary text-xl">visibility</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-slate-900">{summary.totalViews}</p>
          <p className="text-2xs text-slate-400 font-semibold">Blog sayfalarındaki aktif CTA'lar</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase">CTA Tıklaması</span>
            <span className="material-symbols-outlined text-indigo-600 text-xl">ads_click</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-indigo-600">{summary.ctaClicks}</p>
          <p className="text-2xs text-slate-400 font-semibold">Ücretsiz ders & teklif butonları</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase">Ürün / WhatsApp</span>
            <span className="material-symbols-outlined text-emerald-600 text-xl">chat</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-600">{summary.productClicks + summary.whatsappClicks}</p>
          <p className="text-2xs text-slate-400 font-semibold">Ürün kartı ve WhatsApp sorguları</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-extrabold uppercase">Dönüşüm Oranı</span>
            <span className="material-symbols-outlined text-amber-500 text-xl">verified</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-500">{summary.conversionRate}</p>
          <p className="text-2xs text-slate-400 font-semibold">Toplam {summary.totalConversions} tamamlanan kayıt</p>
        </div>
      </div>

      {/* Conversion Funnel Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h4 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">filter_alt</span>
          <span>Dönüşüm Huni Aşamaları (Funnel)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative overflow-hidden">
            <div className="text-xs font-extrabold text-slate-400 uppercase">1. Blog Ziyareti</div>
            <div className="text-xl font-black text-slate-900 mt-1">{summary.totalViews} Gösterim</div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary h-full w-full"></div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 relative overflow-hidden">
            <div className="text-xs font-extrabold text-indigo-400 uppercase">2. CTA Tıklaması</div>
            <div className="text-xl font-black text-indigo-900 mt-1">{summary.ctaClicks} Tıklama</div>
            <div className="w-full bg-indigo-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full" 
                style={{ width: summary.totalViews > 0 ? `${Math.min(100, (summary.ctaClicks / summary.totalViews) * 100)}%` : '0%' }}
              ></div>
            </div>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 relative overflow-hidden">
            <div className="text-xs font-extrabold text-emerald-500 uppercase">3. İlgili Ders / Ürün Seçimi</div>
            <div className="text-xl font-black text-emerald-900 mt-1">{summary.freeLessonClicks + summary.productClicks} Seçim</div>
            <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full" 
                style={{ width: summary.ctaClicks > 0 ? `${Math.min(100, ((summary.freeLessonClicks + summary.productClicks) / summary.ctaClicks) * 100)}%` : '0%' }}
              ></div>
            </div>
          </div>

          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 relative overflow-hidden">
            <div className="text-xs font-extrabold text-amber-600 uppercase">4. Kayıt & Satış</div>
            <div className="text-xl font-black text-amber-900 mt-1">{summary.totalConversions} Kayıt</div>
            <div className="w-full bg-amber-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-amber-500 h-full" 
                style={{ width: summary.totalViews > 0 ? `${Math.min(100, (summary.totalConversions / summary.totalViews) * 100)}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Converting Blogs Table */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">leaderboard</span>
          <span>En Çok Dönüşüm Sağlayan Blog Yazıları</span>
        </h4>

        {topBlogs.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Henüz kaydedilmiş blog dönüşüm verisi bulunmamaktadır.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-2xs uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="p-3">Blog Slug / Konu</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3 text-center">Gösterim</th>
                  <th className="p-3 text-center">CTA Tıklama</th>
                  <th className="p-3 text-center">Ürün / WhatsApp</th>
                  <th className="p-3 text-center">Kayıt / Dönüşüm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {topBlogs.map((blog, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 truncate max-w-xs">
                      /blog/{blog.slug}
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-2xs font-bold bg-primary/10 text-primary">
                        {blog.category}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">{blog.views}</td>
                    <td className="p-3 text-center font-bold text-indigo-600">{blog.ctaClicks}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{blog.productClicks}</td>
                    <td className="p-3 text-center font-black text-amber-600">{blog.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogConversionDashboard;
