import { Link } from 'react-router-dom';
import { FALLBACK_BLOGS } from '../data/staticBlogs';

const RelatedPosts = ({ currentSlug, category }) => {
  let related = FALLBACK_BLOGS.filter(p => p.slug !== currentSlug && p.category === category);
  if (related.length < 3) {
    const additional = FALLBACK_BLOGS.filter(p => p.slug !== currentSlug && !related.some(r => r.slug === p.slug));
    related = [...related, ...additional];
  }
  const displayPosts = related.slice(0, 3);

  if (displayPosts.length === 0) return null;

  return (
    <section className="mt-16 border-t border-slate-200/60 pt-12">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">auto_stories</span>
          <span>İlgili Matematik Rehberleri</span>
        </h3>
        <Link
          to="/blog"
          className="text-sm font-bold text-primary hover:underline inline-flex items-center gap-1"
        >
          <span>Tümünü Gör</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {displayPosts.map(post => (
          <article
            key={post.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md group"
          >
            <div className="h-40 w-full overflow-hidden bg-slate-100 relative">
              {post.coverImage ? (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/80 to-orange-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-white/20">menu_book</span>
                </div>
              )}
              {post.category && (
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-primary font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
                  {post.category}
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h4 className="font-bold text-base text-slate-900 group-hover:text-primary transition-colors line-clamp-2 mb-2 leading-snug">
                {post.title}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                {post.excerpt}
              </p>
              <Link
                to={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-auto"
              >
                <span>İncele</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RelatedPosts;
