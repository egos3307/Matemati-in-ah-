import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SeoAiManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('opportunities'); // 'opportunities' | 'drafts' | 'logs' | 'settings'
  const [overview, setOverview] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [generatingDraftId, setGeneratingDraftId] = useState(null);
  const [suggestingBest, setSuggestingBest] = useState(false);
  const [bestSuggestion, setBestSuggestion] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Draft Editor State
  const [editingDraft, setEditingDraft] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishingDraft, setPublishingDraft] = useState(false);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    autoDraftHighScores: false,
    maxOpportunitiesPerRun: 20,
    maxAutoDraftsPerRun: 2
  });

  const fetchOverview = async () => {
    try {
      const res = await axios.get('/api/teacher/seo/overview');
      setOverview(res.data);
      if (res.data.settings) {
        setSettingsForm({
          autoDraftHighScores: res.data.settings.autoDraftHighScores,
          maxOpportunitiesPerRun: res.data.settings.maxOpportunitiesPerRun,
          maxAutoDraftsPerRun: res.data.settings.maxAutoDraftsPerRun
        });
      }
    } catch (err) {
      console.error('Overview error:', err);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const res = await axios.get('/api/teacher/seo/opportunities');
      setOpportunities(res.data || []);
    } catch (err) {
      console.error('Opportunities error:', err);
    }
  };

  const fetchDrafts = async () => {
    try {
      const res = await axios.get('/api/teacher/seo/drafts');
      const parsedDrafts = (res.data || []).map(d => ({
        ...d,
        secondaryKeywords: typeof d.secondaryKeywords === 'string' ? JSON.parse(d.secondaryKeywords || '[]') : (d.secondaryKeywords || []),
        faq: typeof d.faq === 'string' ? JSON.parse(d.faq || '[]') : (d.faq || []),
        internalLinks: typeof d.internalLinks === 'string' ? JSON.parse(d.internalLinks || '[]') : (d.internalLinks || [])
      }));
      setDrafts(parsedDrafts);
    } catch (err) {
      console.error('Drafts error:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/api/teacher/seo/logs');
      setLogs(res.data || []);
    } catch (err) {
      console.error('Logs error:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg('');
    await Promise.all([fetchOverview(), fetchOpportunities(), fetchDrafts(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleTriggerScan = async () => {
    setScanning(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axios.post('/api/teacher/seo/scan');
      setSuccessMsg(`SEO Taraması Tamamlandı! ${res.data.queriesFound || 0} sorgu incelendi, ${res.data.opportunitiesCreated || 0} fırsat güncellendi/bulundu.`);
      await loadAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'SEO taraması başlatılamadı.');
    } finally {
      setScanning(false);
    }
  };

  const handleGenerateDraft = async (opp) => {
    setGeneratingDraftId(opp.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axios.post('/api/teacher/seo/generate-draft', {
        opportunityId: opp.id,
        keyword: opp.keyword
      });
      setSuccessMsg(`"${opp.keyword}" için AI Blog Taslağı başarıyla oluşturuldu!`);
      await loadAllData();
      setActiveSubTab('drafts');
      // Open created draft in editor
      if (res.data) {
        setEditingDraft({
          ...res.data,
          secondaryKeywords: typeof res.data.secondaryKeywords === 'string' ? JSON.parse(res.data.secondaryKeywords || '[]') : (res.data.secondaryKeywords || []),
          faq: typeof res.data.faq === 'string' ? JSON.parse(res.data.faq || '[]') : (res.data.faq || []),
          internalLinks: typeof res.data.internalLinks === 'string' ? JSON.parse(res.data.internalLinks || '[]') : (res.data.internalLinks || [])
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'AI Taslak üretimi başarısız oldu.');
    } finally {
      setGeneratingDraftId(null);
    }
  };

  const handleSuggestBest = async () => {
    setSuggestingBest(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axios.post('/api/teacher/seo/suggest-best');
      setBestSuggestion(res.data);
      setSuccessMsg(`En yüksek potansiyelli arama fikri bulundu: "${res.data.opportunity?.keyword}"`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'En iyi fikir getirilemedi.');
    } finally {
      setSuggestingBest(false);
    }
  };

  const handleIgnoreOpportunity = async (id) => {
    try {
      await axios.post(`/api/teacher/seo/opportunities/${id}/ignore`);
      setOpportunities(opportunities.filter(o => o.id !== id));
      setSuccessMsg('Fırsat yoksayıldı.');
    } catch (err) {
      setErrorMsg('İşlem başarısız.');
    }
  };

  const handleSaveDraftEdits = async () => {
    if (!editingDraft) return;
    setSavingDraft(true);
    setErrorMsg('');
    try {
      const res = await axios.put(`/api/teacher/seo/drafts/${editingDraft.id}`, editingDraft);
      setSuccessMsg('Taslak güncellendi!');
      await fetchDrafts();
      setEditingDraft(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Taslak kaydedilemedi.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishDraft = async (draftId) => {
    if (!window.confirm('Bu blog taslağını yayına almak istediğinize emin misiniz? Canlı sitede görünecektir.')) return;
    setPublishingDraft(true);
    setErrorMsg('');
    try {
      await axios.post(`/api/teacher/seo/drafts/${draftId}/publish`);
      setSuccessMsg('Blog başarıyla YAYINLANDI!');
      setEditingDraft(null);
      setPreviewModalOpen(false);
      await loadAllData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Blog yayınlanırken hata oluştu.');
    } finally {
      setPublishingDraft(false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm('Bu taslağı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`/api/teacher/seo/drafts/${draftId}`);
      setSuccessMsg('Taslak silindi.');
      if (editingDraft?.id === draftId) setEditingDraft(null);
      await fetchDrafts();
    } catch (err) {
      setErrorMsg('Taslak silinemedi.');
    }
  };

  const handleRegenerateDraft = async (draft) => {
    if (!window.confirm('Bu taslak AI ile yeniden oluşturulacaktır. Yapılan manuel değişiklikler kaybolabilir. Devam edilsin mi?')) return;
    handleGenerateDraft({ id: draft.opportunityId, keyword: draft.targetKeyword });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/teacher/seo/settings', settingsForm);
      setSuccessMsg('SEO & AI Ayarları güncellendi.');
      await fetchOverview();
    } catch (err) {
      setErrorMsg('Ayarlar kaydedilemedi.');
    }
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return 'bg-emerald-500 text-white';
    if (score >= 60) return 'bg-amber-500 text-white';
    return 'bg-blue-500 text-white';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-4">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <span className="font-bold text-sm">SEO & AI Blog Verileri Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Title & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
            <h2 className="text-2xl font-black text-slate-900">SEO & AI Blog Yönetimi</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Matematik ve eğitim arama sorgularını otomatik toplayın, AI ile taslak hazırlayın ve baş öğretmen onayıyla yayınlayın.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSuggestBest}
            disabled={suggestingBest}
            className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            <span>{suggestingBest ? 'Bulunuyor...' : 'AI ile En İyi Fikri Bul'}</span>
          </button>

          <button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">{scanning ? 'sync' : 'search'}</span>
            <span>{scanning ? 'Taranıyor...' : 'SEO Taramasını Şimdi Başlat'}</span>
          </button>
        </div>
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

      {/* System Status Banner */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Search Console</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${overview.gscConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-black text-xs text-slate-800">{overview.gscConnected ? 'Bağlı' : 'Bağlı Değil'}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block truncate">{overview.gscNote}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Son Tarama</span>
            <span className="font-black text-sm text-slate-800">
              {overview.lastScanTime ? new Date(overview.lastScanTime).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Henüz Yapılmadı'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Otomatik / Manuel</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">SEO Fırsatları</span>
            <span className="font-black text-lg text-primary">{overview.stats?.opportunitiesCount || 0}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Tüm sorgu fırsatları</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bekleyen Taslaklar</span>
            <span className="font-black text-lg text-purple-600">{overview.stats?.draftsCount || 0}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Baş öğretmen onayı bekliyor</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Yayınlanan AI Bloglar</span>
            <span className="font-black text-lg text-emerald-600">{overview.stats?.publishedAiCount || 0}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Canlı sitede yayında</span>
          </div>
        </div>
      )}

      {/* Best Suggestion Box if active */}
      {bestSuggestion && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <button onClick={() => setBestSuggestion(null)} className="absolute top-4 right-4 text-white/60 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
          <span className="bg-purple-500/30 text-purple-200 text-[10px] font-black uppercase px-3 py-1 rounded-full inline-block mb-3">
            💡 En Yüksek Potansiyelli AI Önerisi
          </span>
          <h3 className="text-xl font-black">{bestSuggestion.opportunity?.keyword}</h3>
          <p className="text-xs text-purple-200 mt-1">{bestSuggestion.suggestedAnalysis?.opportunityReason}</p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => handleGenerateDraft(bestSuggestion.opportunity)}
              disabled={generatingDraftId === bestSuggestion.opportunity?.id}
              className="px-4 py-2 bg-white text-purple-900 rounded-xl font-bold text-xs hover:bg-purple-50 transition-all cursor-pointer"
            >
              {generatingDraftId === bestSuggestion.opportunity?.id ? 'Oluşturuluyor...' : 'Bu Fikir İçin AI Taslak Oluştur'}
            </button>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab('opportunities')}
          className={`pb-3 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'opportunities' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">insights</span>
          <span>SEO Fırsatları ({opportunities.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('drafts')}
          className={`pb-3 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'drafts' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">edit_note</span>
          <span>AI Taslakları ({drafts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-3 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">receipt_long</span>
          <span>Sistem Logları</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`pb-3 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">settings</span>
          <span>Ayarlar</span>
        </button>
      </div>

      {/* TAB 1: OPPORTUNITIES */}
      {activeSubTab === 'opportunities' && (
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
              <p className="font-bold text-sm">Henüz kaydedilmiş SEO fırsatı bulunamadı.</p>
              <p className="text-xs text-slate-400 mt-1">Yukarıdaki "SEO Taramasını Şimdi Başlat" butonuna basarak potansiyel arama sorgularını toplayabilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp) => (
                <div key={opp.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{opp.source}</span>
                        <h4 className="font-black text-slate-900 text-base mt-0.5">{opp.keyword}</h4>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black shadow-xs ${getScoreBadgeColor(opp.score)}`}>
                          Skor: {opp.score}
                        </span>
                        {opp.status === 'UPDATING_SUGGESTED' && (
                          <span className="mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Mevcut İçeriği Güncelle
                          </span>
                        )}
                        {opp.status === 'DRAFT_CREATED' && (
                          <span className="mt-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                            Taslak Oluşturuldu
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl mt-3 leading-relaxed">
                      💡 {opp.reason || 'Yüksek potansiyelli matematik arama sorgusu.'}
                    </p>

                    {/* Performance metrics breakdown */}
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Gösterim</span>
                        <span className="text-xs font-extrabold text-slate-700">{opp.impressions}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Tıklama</span>
                        <span className="text-xs font-extrabold text-slate-700">{opp.clicks}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">CTR</span>
                        <span className="text-xs font-extrabold text-slate-700">{(opp.ctr * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Ort. Pozisyon</span>
                        <span className="text-xs font-extrabold text-slate-700">{opp.position > 0 ? opp.position.toFixed(1) : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100">
                    {opp.status === 'UPDATING_SUGGESTED' ? (
                      <button
                        onClick={() => handleGenerateDraft(opp)}
                        disabled={generatingDraftId === opp.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">update</span>
                        <span>{generatingDraftId === opp.id ? 'Hazırlanıyor...' : 'Mevcut Yazıyı Güncelle'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerateDraft(opp)}
                        disabled={generatingDraftId === opp.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>{generatingDraftId === opp.id ? 'Taslak Hazırlanıyor...' : 'AI Taslak Oluştur'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleIgnoreOpportunity(opp.id)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      Yoksay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI DRAFTS & EDITOR */}
      {activeSubTab === 'drafts' && (
        <div className="space-y-6">
          {editingDraft ? (
            /* DRAFT EDITOR FORM */
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block mb-1">
                    AI Blog Taslak Düzenleyici
                  </span>
                  <h3 className="text-xl font-black text-slate-900">{editingDraft.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    <span>Önizle</span>
                  </button>
                  <button
                    onClick={() => setEditingDraft(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs cursor-pointer"
                  >
                    Kapat
                  </button>
                </div>
              </div>

              {editingDraft.verificationRequired && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">gavel</span>
                  <span>⚠️ Bu yazıda müfredat/sınav verileri yer alıyor olabilir. Lütfen yayınlamadan önce bilgileri doğrulayın.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blog Başlığı</label>
                  <input
                    type="text"
                    value={editingDraft.title}
                    onChange={(e) => setEditingDraft({ ...editingDraft, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={editingDraft.slug}
                    onChange={(e) => setEditingDraft({ ...editingDraft, slug: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meta Title (SEO)</label>
                  <input
                    type="text"
                    value={editingDraft.metaTitle || ''}
                    onChange={(e) => setEditingDraft({ ...editingDraft, metaTitle: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meta Description (SEO)</label>
                  <input
                    type="text"
                    value={editingDraft.metaDescription || ''}
                    onChange={(e) => setEditingDraft({ ...editingDraft, metaDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hedef Anahtar Kelime</label>
                  <input
                    type="text"
                    value={editingDraft.targetKeyword || ''}
                    onChange={(e) => setEditingDraft({ ...editingDraft, targetKeyword: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-primary outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sınıf / Seviye</label>
                  <input
                    type="text"
                    value={editingDraft.grade || ''}
                    onChange={(e) => setEditingDraft({ ...editingDraft, grade: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Özet (Excerpt)</label>
                <textarea
                  rows={2}
                  value={editingDraft.excerpt || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, excerpt: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-700 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blog HTML İçeriği</label>
                <textarea
                  rows={14}
                  value={editingDraft.content || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, content: e.target.value })}
                  className="w-full p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed outline-none focus:border-primary bg-slate-50/50"
                />
              </div>

              {/* FAQ Editor */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Sıkça Sorulan Sorular (FAQ)</span>
                  <button
                    onClick={() => setEditingDraft({
                      ...editingDraft,
                      faq: [...(editingDraft.faq || []), { question: '', answer: '' }]
                    })}
                    className="text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    + Soru Ekle
                  </button>
                </div>
                {(editingDraft.faq || []).map((faqItem, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <input
                      type="text"
                      placeholder="Soru"
                      value={faqItem.question}
                      onChange={(e) => {
                        const updated = [...editingDraft.faq];
                        updated[idx].question = e.target.value;
                        setEditingDraft({ ...editingDraft, faq: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800"
                    />
                    <textarea
                      rows={2}
                      placeholder="Cevap"
                      value={faqItem.answer}
                      onChange={(e) => {
                        const updated = [...editingDraft.faq];
                        updated[idx].answer = e.target.value;
                        setEditingDraft({ ...editingDraft, faq: updated });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700"
                    />
                  </div>
                ))}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteDraft(editingDraft.id)}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold cursor-pointer"
                  >
                    Sil
                  </button>
                  <button
                    onClick={() => handleRegenerateDraft(editingDraft)}
                    className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold cursor-pointer"
                  >
                    AI ile Yeniden Oluştur
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveDraftEdits}
                    disabled={savingDraft}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    {savingDraft ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>

                  <button
                    onClick={() => handlePublishDraft(editingDraft.id)}
                    disabled={publishingDraft}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">publish</span>
                    <span>{publishingDraft ? 'Yayınlanıyor...' : 'Baş Öğretmen Onayı İle Yayınla'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* DRAFTS LIST */
            <div className="space-y-4">
              {drafts.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">draft</span>
                  <p className="font-bold text-sm">Henüz bekleyen AI blog taslağı bulunmuyor.</p>
                  <p className="text-xs text-slate-400 mt-1">SEO Fırsatları sekmesinden bir fırsat seçip "AI Taslak Oluştur" butonuna basarak yeni taslak hazırlayabilirsiniz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {drafts.map((d) => (
                    <div key={d.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            d.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {d.status === 'PUBLISHED' ? 'Yayınlandı' : 'Taslak Onay Bekliyor'}
                          </span>
                          {d.verificationRequired && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Teyit Gerekli
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">AI: {d.aiProvider} ({d.aiModel})</span>
                        </div>
                        <h4 className="font-black text-slate-900 text-lg">{d.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{d.excerpt}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold pt-1">
                          <span>🎯 Keyword: {d.targetKeyword}</span>
                          <span>•</span>
                          <span>📚 Sınıf: {d.grade || 'Genel'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => setEditingDraft(d)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                        >
                          Düzenle / İncele
                        </button>
                        {d.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => handlePublishDraft(d.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                          >
                            Yayınla
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDraft(d.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h3 className="font-black text-slate-900 text-base mb-2">Otomatik SEO & AI Log Geçmişi</h3>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Henüz kayıtlı işlem logu bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Tarih</th>
                    <th className="py-2.5 px-3">İşlem</th>
                    <th className="py-2.5 px-3">Durum</th>
                    <th className="py-2.5 px-3">AI Provider</th>
                    <th className="py-2.5 px-3">Detaylar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-medium text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">{log.action}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{log.aiProvider || '-'}</td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6 max-w-xl">
          <h3 className="font-black text-slate-900 text-base">Maliyet ve Otomasyon Ayarları</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <span className="font-bold text-xs text-slate-800 block">Otomatik AI Taslak Oluşturma</span>
                <span className="text-[11px] text-slate-500">Yüksek skorlu (75+) SEO fırsatları için tarama sırasında otomatik taslak hazırlar.</span>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.autoDraftHighScores}
                onChange={(e) => setSettingsForm({ ...settingsForm, autoDraftHighScores: e.target.checked })}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bir Taramada Maksimum Fırsat Sayısı</label>
              <input
                type="number"
                value={settingsForm.maxOpportunitiesPerRun}
                onChange={(e) => setSettingsForm({ ...settingsForm, maxOpportunitiesPerRun: parseInt(e.target.value) || 20 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bir Taramada Maksimum Otomatik Taslak Limiti</label>
              <input
                type="number"
                value={settingsForm.maxAutoDraftsPerRun}
                onChange={(e) => setSettingsForm({ ...settingsForm, maxAutoDraftsPerRun: parseInt(e.target.value) || 2 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/20 cursor-pointer hover:bg-primary/90 transition-all"
          >
            Ayarları Kaydet
          </button>
        </form>
      )}

      {/* PREVIEW MODAL */}
      {previewModalOpen && editingDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Blog Önizleme</span>
                <h3 className="text-xl font-black text-slate-900">{editingDraft.title}</h3>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Google Search Result Preview Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Google Arama Sonucu Görünümü</span>
              <div className="text-blue-700 font-medium text-sm hover:underline cursor-pointer">
                {editingDraft.metaTitle || editingDraft.title}
              </div>
              <div className="text-emerald-700 text-xs">
                https://fullematematigi.com.tr/blog/{editingDraft.slug}
              </div>
              <div className="text-slate-600 text-xs line-clamp-2">
                {editingDraft.metaDescription || editingDraft.excerpt}
              </div>
            </div>

            {/* Rendered HTML Content */}
            <div
              className="prose max-w-none text-slate-700 text-sm space-y-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: editingDraft.content }}
            />

            {/* Rendered FAQ */}
            {(editingDraft.faq || []).length > 0 && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-sm text-slate-900">Sıkça Sorulan Sorular (FAQ)</h4>
                {(editingDraft.faq || []).map((faq, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 text-xs">
                    <span className="font-bold text-slate-900 block">{faq.question}</span>
                    <span className="text-slate-600 mt-1 block">{faq.answer}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Kapat
              </button>
              <button
                onClick={() => handlePublishDraft(editingDraft.id)}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
              >
                Yayınla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeoAiManager;
