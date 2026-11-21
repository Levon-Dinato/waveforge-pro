// src/pages/MentionsLegalesPage.tsx
import React from 'react';
import { LegalPageShell } from '../components/LegalPageShell';

export const MentionsLegalesPage: React.FC = () => {
  return (
    <LegalPageShell title="Mentions légales" updatedAt="Novembre 2026">
      <div className="legal-shell">
        <h2>1. Éditeur du site</h2>
        <p>
          Le site <strong>ELEKTRAQ</strong> (accessible à l'adresse <a href="https://elektraq.dj">elektraq.dj</a>)
          est édité à titre personnel / par la structure suivante :
        </p>
        <ul>
          <li><strong>Nom / Raison sociale :</strong> [À compléter — nom de l'éditeur]</li>
          <li><strong>Email de contact :</strong> <a href="mailto:contact@elektraq.com">contact@elektraq.com</a></li>
          <li><strong>Hébergeur :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</li>
        </ul>

        <h2>2. Directeur de la publication</h2>
        <p>
          Le directeur de la publication est [À compléter — nom du responsable].
        </p>

        <h2>3. Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments du site (textes, logo, graphismes, code, design) est protégé par le droit
          d'auteur et la propriété intellectuelle, sauf mention contraire. Toute reproduction sans autorisation
          est interdite.
        </p>
        <p>
          Les contenus audio (sons, mixes, remixes) publiés par les utilisateurs restent la propriété de leurs
          auteurs respectifs, qui conservent l'entière responsabilité des droits associés.
        </p>

        <h2>4. Données personnelles</h2>
        <p>
          Les données collectées sur ELEKTRAQ sont traitées conformément à notre{' '}
          <a href="/confidentialite">Politique de confidentialité</a>.
        </p>

        <h2>5. Responsabilité</h2>
        <p>
          ELEKTRAQ s'efforce d'assurer l'exactitude des informations diffusées, mais ne saurait être tenu
          responsable des erreurs, omissions ou indisponibilités du service. Les contenus publiés par les
          utilisateurs n'engagent que leurs auteurs.
        </p>

        <h2>6. Contact</h2>
        <p>
          Pour toute question relative aux présentes mentions légales, vous pouvez nous écrire à{' '}
          <a href="mailto:contact@elektraq.com">contact@elektraq.com</a>.
        </p>
      </div>
    </LegalPageShell>
  );
};
