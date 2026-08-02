import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Fullematematiği';
const BASE_URL = 'https://fullematematigi.com.tr';
const DEFAULT_IMAGE = `${BASE_URL}/hero-image.png`;
const DEFAULT_KEYWORDS = 'matematik online özel ders, online matematik özel ders, online matematik özel dersi, birebir online matematik özel ders, LGS online matematik özel ders, YKS online matematik özel ders, KPSS online matematik özel ders, online geometri özel ders, matematik canlı ders, Fullematematiği';

const SEO = ({
  title,
  description = 'Matematik online özel ders ve geometri canlı ders platformu Fullematematiği ile YKS, LGS ve KPSS sınavlarına birebir canlı Zoom eğitimiyle hazırlanın. Ücretsiz canlı tanışma dersiyle başlayın!',
  path = '',
  image = DEFAULT_IMAGE,
  keywords = DEFAULT_KEYWORDS,
  schemaData = null
}) => {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `Matematik Online Özel Ders & Canlı Ders | ${SITE_NAME}`;
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
        'description': 'Türkiye\'nin önde gelen online matematik özel ders ve geometri canlı ders platformu Fullematematiği. YKS, LGS, KPSS ve okul sınavları için uzman canlı eğitim.',
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
        '@type': 'Service',
        '@id': `${BASE_URL}/#service-private-math`,
        'name': 'Matematik Online Özel Ders',
        'serviceType': 'Online Education & Private Tutoring',
        'provider': {
          '@type': 'EducationalOrganization',
          'name': 'Fullematematiği'
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.9',
          'reviewCount': '2150',
          'bestRating': '5',
          'worstRating': '1'
        }
      },
      {
        '@type': 'Course',
        '@id': `${BASE_URL}/#course-math`,
        'name': 'Fullematematiği Online Canlı Ders Kampları ve Özel Dersler',
        'description': 'YKS (TYT-AYT), LGS ve KPSS adayları için canlı Zoom üzerinden matematik ve geometri dersleri, 7/24 Drive ders kaydı ve soru çözüm desteği.',
        'provider': {
          '@type': 'EducationalOrganization',
          'name': 'Fullematematiği',
          'url': BASE_URL
        },
        'hasCourseInstance': {
          '@type': 'CourseInstance',
          'courseMode': 'Online',
          'courseWorkload': 'PT4H'
        },
        'offers': {
          '@type': 'Offer',
          'category': 'Education',
          'price': '0',
          'priceCurrency': 'TRY',
          'availability': 'https://schema.org/InStock',
          'url': BASE_URL,
          'validFrom': '2026-01-01',
          'description': 'İlk Ders Ücretsiz Tanışma Dersi'
        }
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
