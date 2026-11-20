// src/pages/CGUPage.tsx
import React from 'react';
import { LegalPageShell } from '../components/LegalPageShell';

export const CGUPage: React.FC = () => {
  return (
    <LegalPageShell title="Conditions générales d'utilisation" updatedAt="Novembre 2026">
      <div className="legal-shell">
        <h2>1. Objet</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (CGU) définissent les règles d'accès et d'utilisation
          de la plateforme <strong>DropZone DJ</strong>. En créant un compte, vous acceptez sans réserve ces conditions.
        </p>

        <h2>2. Accès au service</h2>
        <p>
          L'inscription est gratuite. Certaines fonctionnalités avancées (outils de carrière, statistiques,
          upload illimité) sont réservées aux membres <strong>Premium</strong> et font l'objet d'un abonnement.
        </p>
        <ul>
          <li>Vous devez fournir des informations exactes lors de l'inscription.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
          <li>Vous devez être majeur ou disposer d'une autorisation parentale.</li>
        </ul>

        <h2>3. Contenus publiés</h2>
        <p>
          En publiant un son sur DropZone DJ, vous garantissez :
        </p>
        <ul>
          <li>détenir les droits d'auteur et droits voisins sur ce contenu (ou disposer des autorisations nécessaires) ;</li>
          <li>que le contenu ne viole pas les droits de tiers (copyright, image, vie privée).</li>
        </ul>
        <p>
          <strong>Tout contenu piraté, protégé sans autorisation, ou contrefaisant est strictement interdit</strong>{' '}
          et pourra entraîner la suppression immédiate du contenu et du compte.
        </p>

        <h2>4. Comportement</h2>
        <p>Il est interdit de :</p>
        <ul>
          <li>harceler, insulter ou discriminer d'autres membres ;</li>
          <li>spammer ou faire de la publicité abusive ;</li>
          <li>tenter de porter atteinte à la sécurité ou au bon fonctionnement du site.</li>
        </ul>

        <h2>5. Comptes Premium et paiements</h2>
        <p>
          Les abonnements Premium sont facturés selon les modalités affichées au moment de l'achat. Vous pouvez
          gérer ou annuler votre abonnement depuis votre espace personnel.
        </p>

        <h2>6. Suspension et suppression</h2>
        <p>
          DropZone DJ se réserve le droit de suspendre ou supprimer tout compte en cas de non-respect des présentes
          CGU, sans préavis et sans indemnité.
        </p>

        <h2>7. Évolution des CGU</h2>
        <p>
          Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés des changements
          majeurs. La poursuite de l'utilisation du site vaut acceptation des nouvelles conditions.
        </p>

        <h2>8. Contact</h2>
        <p>
          Pour toute question : <a href="mailto:contact@dropzone-dj.com">contact@dropzone-dj.com</a>.
        </p>
      </div>
    </LegalPageShell>
  );
};
