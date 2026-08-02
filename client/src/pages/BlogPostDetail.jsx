import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import SEO from '../components/SEO';
import { FALLBACK_BLOGS } from '../data/staticBlogs';

const BlogPostDetail = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/blog/${slug}`);
        if (res.data && res.data.title) {
          setPost(res.data);
        } else {
          const fallback = FALLBACK_BLOGS.find(b => b.slug === slug);
          if (fallback) setPost(fallback);
          else setError('Yazı bulunamadı veya bir hata oluştu.');
        }
      } catch (err) {
        console.error('Error fetching blog post, checking static fallback:', err);
        const fallback = FALLBACK_BLOGS.find(b => b.slug === slug);
        if (fallback) {
          setPost(fallback);
          setError(null);
        } else {
          setError('Yazı bulunamadı veya bir hata oluştu.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center py-24 text-slate-400 font-bold uppercase tracking-wider gap-4">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <span>Yazı Yükleniyor...</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-5xl text-red-400 mb-4 font-fill">error</span>
        <h3 className="text-xl font-bold text-slate-800">Hata Oluştu</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md">{error || 'İstediğiniz yazıya şu an ulaşılamıyor.'}</p>
        <Link 
          to="/blog"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Bloga Geri Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 pb-20 pt-8">
      <SEO
        title={post.title}
        description={post.excerpt || post.title}
        path={`/blog/${slug}`}
        image={post.coverImage || undefined}
      />
      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        {/* Back Link */}
        <Link 
          to="/blog"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-primary text-sm font-bold transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Tüm Yazılar
        </Link>

        {/* Article Container */}
        <article className="bg-white rounded-3xl border border-slate-100 p-8 md:p-12 shadow-md">
          {/* Header */}
          <header className="border-b border-slate-100 pb-8 mb-8">
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl leading-tight mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">person</span>
                {post.author?.name || 'Yazar'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">calendar_month</span>
                {new Date(post.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </header>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="w-full max-h-[400px] overflow-hidden rounded-3xl mb-8 border border-slate-100 shadow-sm">
              <img 
                src={post.coverImage} 
                alt={post.title} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {/* Main Content Body */}
          <div 
            className="prose max-w-none text-slate-600 text-base leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
          />
        </article>

        {/* CTA Section */}
        <div className="mt-12 rounded-3xl border border-primary/20 bg-primary/5 p-8 md:p-10 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Kamplarımıza Göz Attınız mı?</h3>
          <p className="text-slate-600 text-sm max-w-xl mx-auto mb-6">
            Uzman kadromuzla hazırladığımız yeni nesil matematik kamplarımızı keşfedin, hedeflerinize ertelemekten vazgeçin.
          </p>
          <Link
            to="/derslerimiz"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 hover:shadow-xl"
          >
            Kampları İncele
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPostDetail;
