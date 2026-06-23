import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get('/api/blog');
        setPosts(res.data);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-20 pt-8">
      {/* Header Section */}
      <div className="bg-white py-16 text-center border-b border-primary/10 shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary mb-4">
            <span className="material-symbols-outlined text-sm">edit_document</span>
            <span>Fullematematik Blog</span>
          </span>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Matematik & Başarı <span className="text-primary">Rehberi</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Sınav taktikleri, matematik çalışma ipuçları ve başarı hikayeleriyle hedeflerinize bir adım daha yaklaşın.
          </p>

          {/* Search Bar */}
          <div className="mx-auto mt-8 max-w-md relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Yazılarda ara..."
              className="w-full pl-12 pr-6 py-3.5 rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-700 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Blog Post Grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 font-bold uppercase tracking-wider gap-4">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
            <span>Yazılar Yükleniyor...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">drafts</span>
            <h3 className="text-lg font-bold text-slate-700">Yazı Bulunamadı</h3>
            <p className="text-sm text-slate-400 mt-1">Aramanızla eşleşen veya henüz yayınlanmış bir blog yazısı bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map(post => (
              <article 
                key={post.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl group"
              >
                {/* Visual Accent / Cover Image */}
                <div className="h-48 w-full overflow-hidden relative bg-slate-100 flex-shrink-0">
                  {post.coverImage ? (
                    <img 
                      src={post.coverImage} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center relative">
                      <span className="material-symbols-outlined text-7xl opacity-15 text-white absolute">menu_book</span>
                      <div className="absolute inset-0 bg-black/5"></div>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6 md:p-8">
                  {/* Title */}
                  <h3 className="font-black text-xl text-slate-900 group-hover:text-primary transition-colors leading-snug mb-3 line-clamp-2">
                    {post.title}
                  </h3>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 mb-4 uppercase tracking-tighter">
                    <span>{post.author?.name || 'Yazar'}</span>
                    <span>•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>

                  {/* Excerpt */}
                  <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Read More Link */}
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
      </div>
    </div>
  );
};

export default Blog;
