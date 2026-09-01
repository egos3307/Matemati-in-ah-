import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SeoOptimizer() {
  const [overview, setOverview] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // AI Analysis Modal State
  const [selectedPage, setSelectedPage] = useState(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  const fetchOptimizerOverview = async () => {
    try {
      const res = await axios.get('/api/teacher/seo/optimizer/overview');
      setOverview(res.data);
    } catch (err) {
      console.error('[Optimizer Overview Error]', err);
    }
  };

  const fetchPages = async (filter = activeFilter) => {
    try {
      const res = await axios.get(`/api/teacher/seo/optimizer/pages?filter=${filter}`);
      setPages(res.data);
    } catch (err) {
      console.error('[Optimizer Pages Error]', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchOptimizerOverview(), fetchPages()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    fetchPages(filter);
  };

  const handleTriggerOptimizerScan = async () => {
    setScanning(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axios.post('/api/teacher/seo/optimizer/scan');
      setSuccessMsg(`SEO Optimizasyon Taraması Tamamlandı! ${res.data.pagesAnalyzed || 0} sayfa analiz edildi.`);
      await loadAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Optimizasyon taraması başlatılamadı.');
    } finally {
      setScanning(false);
    }
  };

  const handleAnalyzePage = async (page) => {
    setAnalyzingId(page.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axios.post(`/api/teacher/seo/optimizer/pages/${page.id}/analyze`);
      setSuccessMsg(`"${page.pageTitle || page.pageUrl}" sayfası için AI analizi tamamlandı!`);
      setSelectedPage(res.data);
      setAnalysisModalOpen(true);
      await fetchPages();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'AI analizi yapılamadı.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleOpenAnalysisModal = (page) => {
    setSelectedPage(page);
    setAnalysisModalOpen(true);
  };

  const handleApplyOptimization = async (page) => {
    if (!page) return;
    const ai = page.aiAnalysis ? JSON.parse(page.aiAnalysis) : null;
    if (!ai) return;

    if (!window.confirm('Bu optimizasyon önerilerini onaylayıp canlı sitede güncellemek istiyor musunuz?')) return;

    setApplyingId(page.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await axios.post(`/api/teacher/seo/optimizer/pages/${page.id}/apply`, {
        titleSuggestion: ai.titleSuggestion,
        metaDescriptionSuggestion: ai.metaDescriptionSuggestion
      });
      setSuccessMsg('Optimizasyon onaylandı ve canlı siteye uygulandı! Google Indexing & Sitemap güncellendi.');
      setAnalysisModalOpen(false);
      await loadAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Optimizasyon uygulanamadı.');
    } finally {
      setApplyingId(null);
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'RISING_CONTENT':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'trending_up', label: '🔥 Yükseliyor' };
      case 'TOP_3_OPPORTUNITY':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'emoji_events', label: '🏆 İlk 3 Fırsatı' };
      case 'FIRST_PAGE_OPPORTUNITY':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'rocket_launch', label: '🚀 İlk Sayfa Fırsatı' };
      case 'RANKING_DROP':
        return { bg: 'bg-red-50 text-red-700 border-red-200', icon: 'trending_down', label: '⚠️ Sıralama Düşüyor' };
      case 'HIGH_IMP_LOW_CTR':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'visibility', label: '👀 Yüksek Gösterim / Düşük CTR' };
      case 'CANNIBALIZATION_RISK':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'swords', label: '⚔️ Cannibalization Riski' };
      case 'CONTENT_REFRESH':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'history', label: '⏳ İçerik Güncelleme' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'info', label: '💤 Potansiyel' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-4">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <span className="font-bold text-sm">SEO Optimizer Performans Verileri Yükleniyor...</span>
      </div>
    );
  }

  const stats = overview?.stats || {};
  const topActions = overview?.topActions || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-2xl">trending_up</span>
            <h2 className="text-2xl font-black">SEO Optimizer & Sıralama Yükseltme</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Yayınlanmış sayfalarınızın Google gösterimlerini takip edin, ilk sayfaya veya ilk 3'e çıkacak fırsatları AI ile güçlendirin.
          </p>
        </div>

        <button
          onClick={handleTriggerOptimizerScan}
          disabled={scanning}
          className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-sm">{scanning ? 'sync' : 'search_check'}</span>
          <span>{scanning ? 'Performans Taranıyor...' : 'SEO Performansını Tara'}</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Toplam Gösterim</span>
          <span className="font-black text-2xl text-slate-900">{stats.totalImpressions?.toLocaleString('tr-TR') || 0}</span>
          <span className="text-[10px] font-semibold text-emerald-600 mt-1 block">Son 28 Gün GSC Verisi</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Toplam Tıklama</span>
          <span className="font-black text-2xl text-emerald-600">{stats.totalClicks?.toLocaleString('tr-TR') || 0}</span>
          <span className="text-[10px] font-semibold text-emerald-600 mt-1 block">Son 28 Gün Ziyaretçi</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ortalama CTR</span>
          <span className="font-black text-2xl text-purple-600">%{stats.avgCtr || 0}</span>
          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Tıklama Oranı</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ort. Pozisyon</span>
          <span className="font-black text-2xl text-amber-600">{stats.avgPosition || 0}</span>
          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Google Sıralaması</span>
        </div>
      </div>

      {/* Priority Actions: Bu Hafta En Önemli 5 SEO İşi */}
      {topActions.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">task_alt</span>
              <h3 className="font-black text-base text-slate-900">Bu Hafta En Önemli 5 SEO İşi</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">En yüksek potansiyelli sayfalar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {topActions.map((act, idx) => {
              const badge = getBadgeStyle(act.opportunityType);
              return (
                <div key={act.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">Skor: {act.score}</span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 line-clamp-2 mb-1" title={act.title || act.pageUrl}>
                      {act.title || act.pageUrl}
                    </h4>
                    <span className="text-[10px] text-slate-500 block truncate">Sorgu: {act.topQuery}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-800">Sıra: {act.position}</span>
                    <button
                      onClick={() => handleAnalyzePage(act)}
                      disabled={analyzingId === act.id}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {analyzingId === act.id ? '...' : 'Analiz Et'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'ALL', label: 'Tüm Sayfalar' },
          { id: 'TOP_3', label: '🏆 İlk 3 Fırsatı' },
          { id: 'FIRST_PAGE', label: '🚀 İlk Sayfa Fırsatı' },
          { id: 'RISING', label: '🔥 Yükselenler' },
          { id: 'DROPPING', label: '⚠️ Sıralama Düşenler' },
          { id: 'LOW_CTR', label: '👀 Düşük CTR' },
          { id: 'CANNIBALIZATION', label: '⚔️ Cannibalization' },
          { id: 'NEEDS_REFRESH', label: '⏳ İçerik Güncelleme' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => handleFilterChange(f.id)}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeFilter === f.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pages Opportunity List */}
      {pages.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-slate-300">find_in_page</span>
          <h4 className="font-bold text-slate-700 text-sm">Seçilen filtre için henüz kaydedilmiş SEO optimizasyon verisi yok.</h4>
          <p className="text-xs text-slate-400">
            Google Search Console verilerinizi taramak için sağ üstteki <strong>"SEO Performansını Tara"</strong> butonuna basın.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => {
            const badge = getBadgeStyle(page.opportunityType);
            const ai = page.aiAnalysis ? JSON.parse(page.aiAnalysis) : null;

            return (
              <div key={page.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4 hover:border-slate-300 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 ${badge.bg}`}>
                        <span className="material-symbols-outlined text-xs">{badge.icon}</span>
                        <span>{badge.label}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                        Optimizasyon Skoru: {page.optimizationScore}/100
                      </span>

                      {page.status === 'APPLIED' && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          ✓ Uygulandı
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-base text-slate-900">
                      <a href={page.pageUrl} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                        <span>{page.pageTitle || page.pageUrl}</span>
                        <span className="material-symbols-outlined text-xs text-slate-400">open_in_new</span>
                      </a>
                    </h4>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
                      <span>Ana Sorgu: <strong className="text-slate-800">{page.topQuery || page.targetKeyword}</strong></span>
                      <span>URL: <code className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{page.pageUrl}</code></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-center px-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Pozisyon</span>
                      <span className="font-black text-sm text-slate-900">{page.position}</span>
                      {page.positionChange !== 0 && (
                        <span className={`text-[10px] font-bold block ${page.positionChange < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {page.positionChange < 0 ? `▲ ${Math.abs(page.positionChange)}` : `▼ ${page.positionChange}`}
                        </span>
                      )}
                    </div>

                    <div className="text-center border-l border-slate-200 pl-3 px-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Gösterim</span>
                      <span className="font-black text-sm text-slate-900">{page.impressions?.toLocaleString('tr-TR')}</span>
                    </div>

                    <div className="text-center border-l border-slate-200 pl-3 px-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Tıklama / CTR</span>
                      <span className="font-black text-sm text-purple-700">{page.clicks} / %{((page.ctr || 0) * 100).toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* AI Analysis Result Brief */}
                {ai && (
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-purple-900 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-purple-600">auto_awesome</span>
                        <span>AI Analiz Özeti: {ai.mainProblem}</span>
                      </span>
                      <span className="text-[10px] font-bold text-purple-700">Arama Amacı: {ai.searchIntent}</span>
                    </div>
                    <p className="text-slate-700">{ai.summary}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  {ai ? (
                    <button
                      onClick={() => handleOpenAnalysisModal(page)}
                      className="px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>AI Önerilerini İncele & Önizle</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAnalyzePage(page)}
                      disabled={analyzingId === page.id}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">{analyzingId === page.id ? 'sync' : 'auto_awesome'}</span>
                      <span>{analyzingId === page.id ? 'AI Analiz Ediyor...' : 'AI ile Analiz Et'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Analysis Preview Modal */}
      {analysisModalOpen && selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full my-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-2xl">auto_awesome</span>
                <div>
                  <h3 className="font-black text-lg text-slate-900">AI SEO Optimizasyon Önerileri</h3>
                  <span className="text-xs text-slate-500">{selectedPage.pageTitle || selectedPage.pageUrl}</span>
                </div>
              </div>
              <button
                onClick={() => setAnalysisModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {selectedPage.aiAnalysis ? (() => {
              const ai = JSON.parse(selectedPage.aiAnalysis);
              return (
                <div className="space-y-5 text-xs">
                  {/* Problem & Search Intent */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                      <span className="font-black text-red-800 block mb-1">Tespit Edilen Temel Problem</span>
                      <p className="text-slate-700">{ai.mainProblem}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                      <span className="font-black text-blue-800 block mb-1">Öğrenci Arama Amacı (Search Intent)</span>
                      <p className="text-slate-700">{ai.searchIntent}</p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-black text-slate-900 block mb-1">Genel Değerlendirme</span>
                    <p className="text-slate-700 leading-relaxed">{ai.summary}</p>
                  </div>

                  {/* Title & Meta Before vs After Comparison */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                      <span className="font-black text-purple-900 text-sm flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-purple-600 text-base">swap_horiz</span>
                        <span>Önce / Sonra Değişim Karşılaştırması</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-200/80 text-purple-900 font-bold text-[10px]">Güncel Eğitim Yılı: 2026-2027</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-red-200/80 space-y-1">
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Mevcut Başlık (Eski)</span>
                        <p className="font-semibold text-slate-800 text-xs">{selectedPage.pageTitle || selectedPage.pageUrl}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-emerald-300 space-y-1 shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                          <span>Önerilen Yeni Başlık (AI - 2026-2027)</span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 rounded">Yeni</span>
                        </span>
                        <p className="font-bold text-slate-900 text-xs text-emerald-950">{ai.titleSuggestion}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-1">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Önerilen SEO Meta Açıklaması (Meta Description)</span>
                      <p className="text-slate-700 text-xs leading-relaxed">{ai.metaDescriptionSuggestion}</p>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  {(ai.recommendedActions || []).length > 0 && (
                    <div className="space-y-2">
                      <span className="font-black text-slate-900 text-sm block">Önerilen Somut Adımlar</span>
                      <ul className="space-y-1.5 pl-4 list-disc text-slate-700">
                        {ai.recommendedActions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Internal Links */}
                  {(ai.internalLinksToAdd || []).length > 0 && (
                    <div className="space-y-2">
                      <span className="font-black text-slate-900 text-sm block">Eklenmesi Gereken İç Bağlantılar (Internal Links)</span>
                      <div className="space-y-1">
                        {ai.internalLinksToAdd.map((link, i) => (
                          <div key={i} className="p-2 rounded-xl bg-slate-100 flex items-center justify-between">
                            <span className="font-bold text-slate-800">"{link.anchorText}"</span>
                            <code className="text-[10px] text-primary">{link.targetUrl}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setAnalysisModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Kapat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyOptimization(selectedPage)}
                      disabled={applyingId === selectedPage.id}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">{applyingId === selectedPage.id ? 'sync' : 'check'}</span>
                      <span>{applyingId === selectedPage.id ? 'Uygulanıyor...' : 'Onayla ve Uygula'}</span>
                    </button>
                  </div>
                </div>
              );
            })() : null}
          </div>
        </div>
      )}
    </div>
  );
}
