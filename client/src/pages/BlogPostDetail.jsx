import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import RelatedPosts from '../components/RelatedPosts';
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
      } catch {
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
        <h1 className="text-xl font-bold text-slate-800">Yazı Bulunamadı</h1>
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

  // FAQ Schema if available
  let faqSchema = null;
  if (post.faq && post.faq.length > 0) {
    faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    };
  }

  return (
    <main className="relative min-h-screen bg-slate-50/50 pb-20 pt-8">
      <SEO
        title={post.metaTitle || `${post.title} | Fullematematiği`}
        description={post.description || post.excerpt || post.title}
        path={`/blog/${slug}`}
        image={post.coverImage || undefined}
        keywords={post.targetKeyword ? `${post.targetKeyword}, ${post.relatedKeywords?.join(', ') || ''}` : undefined}
        type="article"
        publishedAt={post.createdAt}
        updatedAt={post.updatedAt}
        authorName={post.author?.name}
        schemaData={faqSchema ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.description || post.excerpt,
              url: `https://fullematematigi.com.tr/blog/${slug}`,
              datePublished: post.createdAt,
              dateModified: post.updatedAt || post.createdAt,
              author: { '@type': 'Organization', name: post.author?.name || 'Fullematematiği' }
            },
            faqSchema
          ]
        } : null}
      />

      <div className="mx-auto max-w-4xl px-6 lg:px-10">
        {/* Visible Breadcrumb */}
        <Breadcrumb 
          items={[
            { name: 'Blog', url: '/blog' },
            { name: post.title, url: `/blog/${slug}` }
          ]} 
        />

        {/* Back Link */}
        <Link 
          to="/blog"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-primary text-xs font-bold transition-colors mb-6"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Tüm Matematik Rehberleri
        </Link>

        {/* Article Container */}
        <article className="bg-white rounded-3xl border border-slate-100 p-8 md:p-12 shadow-md">
          {/* Header */}
          <header className="border-b border-slate-100 pb-8 mb-8">
            {post.category && (
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
                {post.category}
              </span>
            )}
            <h1 className="text-3xl font-black text-slate-900 md:text-4xl leading-tight mb-4">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">person</span>
                {post.author?.name || 'Fullematematiği Kadrosu'}
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
            <div className="w-full max-h-[420px] overflow-hidden rounded-3xl mb-8 border border-slate-100 shadow-sm">
              <img 
                src={post.coverImage} 
                alt={post.title} 
                loading="eager"
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {/* Main Content Body */}
          <div 
            className="prose max-w-none text-slate-700 text-base leading-relaxed space-y-4 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1.5"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
          />

          {/* FAQ Section if available */}
          {post.faq && post.faq.length > 0 && (
            <section className="mt-12 rounded-2xl bg-slate-50 p-6 md:p-8 border border-slate-200/80">
              <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">help</span>
                <span>Sıkça Sorulan Sorular</span>
              </h2>
              <div className="space-y-4">
                {post.faq.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
                    <h3 className="font-bold text-slate-900 text-sm mb-1">{item.question}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* CTA Section */}
        <section className="mt-12 rounded-3xl border border-primary/20 bg-primary/5 p-8 md:p-10 text-center">
          <h2 className="text-xl font-black text-slate-900 mb-2">Ücretsiz Canlı Matematik Tanışma Dersi!</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto mb-6">
            LGS, TYT, AYT veya KPSS sınavlarında hedeflediğin dereceye ulaşmak için uzman kadromuzla hemen canlı tanışma dersine katıl.
          </p>
          <Link
            to="/derslerimiz"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/95 hover:shadow-xl"
          >
            Canlı Dersleri İncele
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </section>

        {/* Related Posts Section */}
        <RelatedPosts currentSlug={slug} category={post.category} />
      </div>
    </main>
  );
};

export default BlogPostDetail;
