import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BlogConversionDashboard = ({ onNavigateTab }) => {
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

  const { summary, topBlogs, recentLeads = [] } = data;

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

      {/* Information & Tab Navigation Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-indigo-700/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
            <span className="material-symbols-outlined text-lg">info</span>
            <span>Kayıtlar Nerede Görünür?</span>
          </div>
          <p className="text-xs text-indigo-100/90 leading-relaxed max-w-2xl font-medium">
            Bloglardaki <b>"Ücretsiz Tanışma Dersi Planla"</b> butonuna basan öğrenciler <span className="text-amber-300 font-bold">Formdan Gelenler</span> sekmesinde listelenir. <b>"Kontenjan / Paket Seçimi"</b> formunu dolduranlar ise <span className="text-amber-300 font-bold">Kontenjan Yönetimi</span> sekmesinde listelenir.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
          {onNavigateTab && (
            <>
              <button
                onClick={() => onNavigateTab('forms')}
                className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">forum</span>
                <span>Formdan Gelenler'i Aç</span>
              </button>
              <button
                onClick={() => onNavigateTab('quota')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                <span>Kontenjan Yönetimi'ni Aç</span>
              </button>
            </>
          )}
        </div>
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
          <p className="text-2xs text-slate-400 font-semibold">Toplam {summary.totalConversions} tamamlanan form</p>
        </div>
      </div>

      {/* Recent Leads / Submissions Table */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">contacts</span>
            <span>Gelen Başvuru & İletişim Detayları ({recentLeads.length})</span>
          </h4>
          <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">
            Site ve bloglardan gönderilen son başvuranlar
          </span>
        </div>

        {recentLeads.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
            <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">inbox</span>
            <p className="text-xs font-bold">Henüz kaydedilmiş başvuru formu kaydı bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-2xs uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="p-3">Öğrenci Adı</th>
                  <th className="p-3">Başvuru Türü</th>
                  <th className="p-3">Telefon</th>
                  <th className="p-3">Sınıf / Kurs</th>
                  <th className="p-3 text-center">Tarih</th>
                  <th className="p-3 text-center">Durum</th>
                  <th className="p-3 text-right">Hızlı İletişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentLeads.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      {lead.studentName || 'İsimsiz'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-extrabold ${
                        lead.sourceType === 'TRIAL_LESSON'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        {lead.sourceLabel}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {lead.phone || '-'}
                    </td>
                    <td className="p-3 text-slate-600 font-medium text-xs">
                      {lead.grade || '-'}
                    </td>
                    <td className="p-3 text-center text-xs text-slate-400">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-2xs font-bold ${
                        lead.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        lead.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {lead.status === 'APPROVED' ? 'Onaylandı' : lead.status === 'REJECTED' ? 'Reddedildi' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {lead.phone && (
                        <a
                          href={`https://wa.me/90${(lead.phone || '').toString().replace(/\D/g, '').replace(/^0/, '')}?text=Merhaba%20${encodeURIComponent(lead.studentName || '')},%20Matematiğin Şahı%20başvurunuz%20için%20iletişime%20geçiyorum.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-all"
                        >
                          <span className="material-symbols-outlined text-xs">chat</span>
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
