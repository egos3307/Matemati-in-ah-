import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Fullematematiği';
const BASE_URL = 'https://fullematematigi.com.tr';
const DEFAULT_IMAGE = `${BASE_URL}/hero-image.png`;
const DEFAULT_KEYWORDS = 'matematik, matematik online ders, matematik özel ders, matematik canlı ders, kpss matematik online ders, lgs matematik online ders, tyt matematik online ders, ayt matematik online ders, Fullematematiği';

const SEO = ({
  title,
  description = 'Matematik online ders, matematik özel ders ve geometri canlı ders platformu Fullematematiği ile KPSS, LGS, TYT ve AYT sınavlarına birebir hazırlanın. Ücretsiz canlı tanışma dersiyle başlayın!',
  path = '',
  image = DEFAULT_IMAGE,
  keywords = DEFAULT_KEYWORDS,
  schemaData = null
}) => {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `Matematik Online Ders & Özel Ders | KPSS, LGS, TYT, AYT – ${SITE_NAME}`;
  const url = `${BASE_URL}${path}`;

  // Generate automatic BreadcrumbList schema based on current path
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      'position': 1,
      'name': 'Ana Sayfa',
      'item': BASE_URL
    }
  ];

  if (path && path !== '/') {
    const pageName = title ? title.split('|')[0].trim() : path.replace('/', '').toUpperCase();
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': pageName,
      'item': url
    });
  }

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    '@id': `${url}/#breadcrumb`,
    'itemListElement': breadcrumbItems
  };

  const defaultSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': `${BASE_URL}/#organization`,
        'name': 'Fullematematiği',
        'url': BASE_URL,
        'logo': `${BASE_URL}/logo.png`,
        'image': image,
        'description': 'Türkiye\'nin önde gelen KPSS online ders, LGS online ders, TYT-AYT matematik online özel ders ve geometri platformu.',
        'telephone': '+90-535-059-8950',
        'priceRange': '₺₺',
        'address': {
          '@type': 'PostalAddress',
          'addressCountry': 'TR'
        },
        'contactPoint': {
          '@type': 'ContactPoint',
          'telephone': '+90-535-059-8950',
          'contactType': 'customer support',
          'availableLanguage': ['Turkish']
        },
        'sameAs': [
          'https://www.instagram.com/fullematematigi',
          'https://www.youtube.com/@FULLEMATEMAT%C4%B0G%C4%B0'
        ]
      },
      {
        '@type': 'Course',
        '@id': `${BASE_URL}/#course-kpss`,
        'name': 'KPSS Matematik & Geometri Online Ders Kampı',
        'description': 'KPSS Lisans ve Ön Lisans adayları için pratik soru çözümleri, çıkmış soru analizleri ve 54 canlı Zoom dersi.',
        'provider': { '@type': 'EducationalOrganization', 'name': 'Fullematematiği' }
      },
      {
        '@type': 'Course',
        '@id': `${BASE_URL}/#course-lgs`,
        'name': 'LGS 2027 Yeni Nesil Matematik & Geometri Online Ders Kampı',
        'description': '8. Sınıf LGS adayları için mantık-muhakeme, yeni nesil soru çözümleri ve canlı grup dersleri.',
        'provider': { '@type': 'EducationalOrganization', 'name': 'Fullematematiği' }
      },
      {
        '@type': 'Course',
        '@id': `${BASE_URL}/#course-yks`,
        'name': 'YKS (TYT - AYT) Matematik & Geometri Online Ders Kampı',
        'description': '11, 12. sınıf ve mezunlar için TYT-AYT matematik ve geometri konu anlatımları, derece yaptırma kampları.',
        'provider': { '@type': 'EducationalOrganization', 'name': 'Fullematematiği' }
      },
      breadcrumbSchema
    ]
  };

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="tr_TR" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData || defaultSchema)}
      </script>
    </Helmet>
  );
};

export default SEO;
