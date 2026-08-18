import { Link } from 'react-router-dom';

const Breadcrumb = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center text-xs font-semibold text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <li>
          <Link
            to="/"
            className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">home</span>
            <span>Ana Sayfa</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5 sm:gap-2">
              <span className="material-symbols-outlined text-xs text-slate-400">chevron_right</span>
              {isLast ? (
                <span className="font-bold text-slate-800 line-clamp-1 max-w-[200px] sm:max-w-[350px]" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.url}
                  className="text-slate-500 hover:text-primary transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
