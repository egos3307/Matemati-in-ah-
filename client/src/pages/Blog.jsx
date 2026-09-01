import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import { FALLBACK_BLOGS } from '../data/staticBlogs';

const Blog = () => {
  const [posts, setPosts] = useState(FALLBACK_BLOGS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get('/api/blog');
        if (res.data && res.data.length > 0) {
          const apiSlugs = new Set(res.data.map(p => p.slug));
          const combined = [...res.data, ...FALLBACK_BLOGS.filter(b => !apiSlugs.has(b.slug))];
          setPosts(combined);
        } else {
          setPosts(FALLBACK_BLOGS);
        }
      } catch {
        setPosts(FALLBACK_BLOGS);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const categories = ['Tümü', 'YKS Hazırlık', 'LGS Hazırlık', 'Lise Matematik', 'Matematik Konuları', 'Geometri', 'Rehberlik'];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tümü' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="relative min-h-screen bg-slate-50/50 pb-20 pt-8">
      <SEO
        title="Matematik Rehberleri & Sınav Taktikleri"
        description="LGS, TYT, AYT ve KPSS matematik ve geometri konu anlatımları, 9. sınıf müfredatı, soru dağılımları ve derece çalışma rehberleri."
        path="/blog"
        keywords="matematik konuları, tyt matematik konuları, lgs matematik konuları, 9 sınıf matematik konuları, geometri taktikleri, matematik rehberleri"
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Breadcrumb items={[{ name: 'Blog', url: '/blog' }]} />
      </div>

      {/* Header Section */}
      <header className="bg-white py-12 text-center border-b border-primary/10 shadow-xs mb-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-bold text-primary mb-4 uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">edit_document</span>
            <span>Fullematematiği Blog & Rehberlik</span>
          </span>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
            Matematik & Sınav Başarı <span className="text-primary">Rehberleri</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 leading-relaxed">
            LGS, TYT, AYT ve KPSS hazırlığında konu anlatımları, güncel müfredat detayları, soru dağılımları ve derece taktikleri.
          </p>

          {/* Search Bar */}
          <div className="mx-auto mt-8 max-w-md relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Konularda veya rehberlerde ara..."
              className="w-full pl-12 pr-6 py-3.5 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-medium text-slate-700 transition-all shadow-xs text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Blog Post Grid */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 font-bold uppercase tracking-wider gap-4">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            <span>Rehberler Yükleniyor...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">drafts</span>
            <h3 className="text-lg font-bold text-slate-700">Rehber Bulunamadı</h3>
            <p className="text-sm text-slate-400 mt-1">Aramanızla eşleşen matematik içeriği bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map(post => (
              <article 
                key={post.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl group"
              >
                {/* Cover Image */}
                <div className="h-48 w-full overflow-hidden relative bg-slate-100 flex-shrink-0">
                  {post.coverImage ? (
                    <img 
                      src={post.coverImage} 
                      alt={post.title}
                      loading="lazy" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center relative">
                      <span className="material-symbols-outlined text-7xl opacity-15 text-white absolute">menu_book</span>
                    </div>
                  )}
                  {post.category && (
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-primary font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xs">
                      {post.category}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6 md:p-8">
                  <h2 className="font-black text-xl text-slate-900 group-hover:text-primary transition-colors leading-snug mb-3 line-clamp-2">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>

                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 mb-4 uppercase tracking-tighter">
                    <span>{(!post.author?.name || post.author.name.toLowerCase().includes('test')) ? 'Burak Çelik' : post.author.name}</span>
                    <span>•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>

                  <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <Link 
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-primary text-sm font-bold group-hover:gap-2.5 transition-all mt-auto"
                  >
                    Devamını Oku
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Blog;
