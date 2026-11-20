// src/pages/ConfidentialitePage.tsx
import React from 'react';
import { LegalPageShell } from '../components/LegalPageShell';

export const ConfidentialitePage: React.FC = () => {
  return (
    <LegalPageShell title="Politique de confidentialité" updatedAt="Novembre 2026">
      <div className="legal-shell">
        <h2>1. Données collectées</h2>
        <p>Nous collectons les informations suivantes :</p>
        <ul>
          <li><strong>Données de compte :</strong> adresse e-mail, pseudo, avatar (fournis lors de l'inscription).</li>
          <li><strong>Contenus publiés :</strong> sons, titres, pochettes, biographie.</li>
          <li><strong>Données d'usage :</strong> statistiques d'écoute, de téléchargement, et données techniques (navigateur, appareil).</li>
        </ul>

        <h2>2. Finalités du traitement</h2>
        <p>Ces données sont utilisées pour :</p>
        <ul>
          <li>fournir et améliorer le service (lecture, partage, statistiques) ;</li>
          <li>gérer votre compte et vos abonnements Premium ;</li>
          <li>assurer la sécurité et prévenir les abus.</li>
        </ul>

        <h2>3. Base légale</h2>
        <p>
          Le traitement repose sur l'exécution du contrat (CGU), votre consentement (pour certaines
          communications) et notre intérêt légitime (sécurité, amélioration du service).
        </p>

        <h2>4. Durée de conservation</h2>
        <p>
          Les données sont conservées tant que votre compte est actif. À la suppression du compte, vos données
          personnelles sont supprimées ou anonymisées, dans les limites des obligations légales.
        </p>

        <h2>5. Partage des données</h2>
        <p>
          Vos données ne sont jamais vendues. Elles peuvent être transmises à des sous-traitants techniques
          (hébergement, base de données — Supabase, Vercel) strictement dans le cadre du fonctionnement du service.
        </p>

        <h2>6. Cookies et traceurs</h2>
        <p>
          Le site utilise des technologies de stockage local et des outils d'analyse (analytics) pour mesurer
          l'audience. Vous pouvez configurer votre navigateur pour les bloquer.
        </p>

        <h2>7. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression, de limitation,
          de portabilité et d'opposition sur vos données.
        </p>
        <p>
          Pour exercer ces droits, contactez-nous à{' '}
          <a href="mailto:contact@dropzone-dj.com">contact@dropzone-dj.com</a>.
        </p>
      </div>
    </LegalPageShell>
  );
};
