import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Fullematematiği';
const BASE_URL = 'https://fullematematigi.com.tr';
const DEFAULT_IMAGE = `${BASE_URL}/logo.png`;
const DEFAULT_KEYWORDS = 'matematik, matematik online ders, matematik özel ders, matematik canlı ders, kpss matematik online ders, lgs matematik online ders, tyt matematik online ders, ayt matematik online ders, 9 sınıf matematik konuları, lgs matematik konuları, tyt matematik konuları, Fullematematiği';

const SEO = ({
  title,
  description = 'Türkiye’de LGS, TYT, AYT ve KPSS hazırlığındaki öğrenciler için birebir ve canlı grup matematik konu anlatımı, soru çözümü ve çalışma rehberleri.',
  path = '',
  image = DEFAULT_IMAGE,
  keywords = DEFAULT_KEYWORDS,
  type = 'website',
  publishedAt,
  updatedAt,
  authorName,
  schemaData = null,
  noindex = false
}) => {
  const fullTitle = !title
    ? `Fullematematiği | LGS, TYT, AYT ve KPSS Matematik`
    : title.includes(SITE_NAME)
    ? title
    : `${title} | ${SITE_NAME}`;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = path === '/' || path === '' ? BASE_URL : `${BASE_URL}${cleanPath}`;
  const ogImage = image.startsWith('http') ? image : `${BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;

  // Generate BreadcrumbList
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Ana Sayfa',
      item: BASE_URL
    }
  ];

  if (cleanPath && cleanPath !== '/') {
    const segments = cleanPath.split('/').filter(Boolean);
    let currentPath = '';
    segments.forEach((segment, idx) => {
      currentPath += `/${segment}`;
      let name = segment.replace(/-/g, ' ');
      if (segment === 'blog') name = 'Blog';
      else if (idx === segments.length - 1 && title) {
        name = title.split('|')[0].trim();
      } else {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: idx + 2,
        name: name,
        item: `${BASE_URL}${currentPath}`
      });
    });
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}/#breadcrumb`,
    itemListElement: breadcrumbItems
  };

  let finalSchema = schemaData;
  if (!finalSchema) {
    if (type === 'article') {
      finalSchema = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BlogPosting',
            '@id': `${canonicalUrl}/#article`,
            isPartOf: { '@id': `${BASE_URL}/blog` },
            headline: title ? title.split('|')[0].trim() : '',
            description: description,
            url: canonicalUrl,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            image: ogImage,
            datePublished: publishedAt || new Date().toISOString(),
            dateModified: updatedAt || publishedAt || new Date().toISOString(),
            author: {
              '@type': 'Organization',
              name: authorName || 'Fullematematiği Eğitim Kadrosu',
              url: BASE_URL
            },
            publisher: {
              '@type': 'EducationalOrganization',
              name: 'Fullematematiği',
              logo: {
                '@type': 'ImageObject',
                url: `${BASE_URL}/logo.png`
              }
            },
            inLanguage: 'tr-TR'
          },
          breadcrumbSchema
        ]
      };
    } else {
      finalSchema = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            url: BASE_URL,
            name: 'Fullematematiği',
            description: 'Türkiye\'nin LGS, TYT, AYT ve KPSS online matematik ve geometri platformu.',
            inLanguage: 'tr-TR'
          },
          {
            '@type': 'EducationalOrganization',
            '@id': `${BASE_URL}/#organization`,
            name: 'Fullematematiği',
            url: BASE_URL,
            logo: `${BASE_URL}/logo.png`,
            image: ogImage,
            description: 'Türkiye\'de LGS, TYT, AYT ve KPSS öğrencileri için online matematik konu anlatımı, özel ders ve rehberlik platformu.',
            sameAs: [
              'https://www.instagram.com/fullematematigi',
              'https://www.youtube.com/@FULLEMATEMAT%C4%B0G%C4%B0'
            ]
          },
          breadcrumbSchema
        ]
      };
    }
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="theme-color" content="#f3ab00" />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}
      />

      {/* Open Graph */}
      <meta property="og:type" content={type === 'article' ? 'article' : 'website'} />
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(finalSchema)}
      </script>
    </Helmet>
  );
};

export default SEO;
