// src/components/PageMeta.tsx
// Composant SEO réutilisable : titre + meta description + Open Graph.
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface PageMetaProps {
  title: string;
  description?: string;
}

export const PageMeta: React.FC<PageMetaProps> = ({ title, description }) => {
  const fullTitle = title.includes('DropZone DJ') ? title : `${title} — DropZone DJ`;
  const desc = description || 'DropZone DJ, la plateforme gratuite où les DJs indépendants partagent leurs sons et font vibrer la communauté.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
    </Helmet>
  );
};
