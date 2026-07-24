import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SEO from '../components/SEO';

const PdfNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [activePdfModal, setActivePdfModal] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/pdf-notes');
      setNotes(res.data);
    } catch (err) {
      console.error('Error fetching pdf notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Tümü', 'LGS', 'YKS', 'KPSS', '9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Genel'];

  const filteredNotes = notes.filter(note => {
    const matchesCategory = selectedCategory === 'Tümü' || note.category === selectedCategory;
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (note.description && note.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-8 font-sans text-slate-800">
      <SEO
        title="PDF Matematik Ders Notları ve Yaprak Testler | Fullematematiği"
        description="Öğretmenlerimizin hazırladığı LGS, YKS, KPSS ve sınıf seviyelerine özel ücretsiz PDF matematik ders notları ve soru fasiküllerini hemen indirin!"
        path="/pdf-notlari"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-primary p-8 sm:p-12 rounded-3xl text-white shadow-xl relative overflow-hidden mb-10">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <span className="bg-white/15 border border-white/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-amber-300">
              Ücretsiz Kaynaklar
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mt-3 leading-tight">
              Matematik <span className="text-primary">PDF Ders Notları</span> ve Testler
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium mt-3 leading-relaxed">
              Uzman öğretmen kadromuz tarafından Türkiye Yüzyılı Maarif Modeline uygun hazırlanan LGS, YKS ve KPSS matematik ders fasiküllerine ücretsiz ulaşabilirsiniz.
            </p>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm mb-8 space-y-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Not başlığı veya konu ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">PDF Notlar Yükleniyor...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-md mx-auto space-y-3">
            <span className="material-symbols-outlined text-5xl text-slate-300">find_in_page</span>
            <h3 className="font-black text-slate-800 text-lg">Henüz Ders Notu Bulunamadı</h3>
            <p className="text-xs text-slate-500 font-medium">
              Aradığınız kriterlere uygun yayınlanmış PDF ders notu henüz bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      {note.category || 'Genel'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors leading-snug">
                    {note.title}
                  </h3>

                  {note.description && (
                    <p className="text-xs font-medium text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {note.description}
                    </p>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs">
                      {note.author?.name ? note.author.name.charAt(0) : 'Ö'}
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">
                      {note.author?.name || 'Öğretmen'}
                    </span>
                  </div>

                  <button
                    onClick={() => setActivePdfModal(note)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                    <span>İncele / İndir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF View Modal */}
      {activePdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded">
                  {activePdfModal.category}
                </span>
                <h3 className="font-black text-slate-900 text-lg mt-1">{activePdfModal.title}</h3>
              </div>
              <button
                onClick={() => setActivePdfModal(null)}
                className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 p-4 bg-slate-900 overflow-hidden min-h-[400px]">
              {activePdfModal.pdfUrl.startsWith('data:application/pdf') || activePdfModal.pdfUrl.endsWith('.pdf') ? (
                <iframe
                  src={activePdfModal.pdfUrl}
                  title={activePdfModal.title}
                  className="w-full h-full min-h-[500px] rounded-xl border-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white space-y-4 p-8 text-center">
                  <span className="material-symbols-outlined text-6xl text-primary">description</span>
                  <div>
                    <h4 className="font-bold text-base">{activePdfModal.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">{activePdfModal.description}</p>
                  </div>
                  <a
                    href={activePdfModal.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={activePdfModal.fileName || 'ders-notu.pdf'}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-2xl text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">download</span>
                    PDF İndir / Aç
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
              <span className="text-xs font-semibold text-slate-500">
                Yayınlayan: {activePdfModal.author?.name || 'Öğretmen'}
              </span>
              <a
                href={activePdfModal.pdfUrl}
                download={activePdfModal.fileName || 'ders-notu.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Dosyayı Cihaza İndir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfNotes;
