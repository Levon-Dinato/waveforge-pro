// src/components/PayPalButton.tsx
import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    paypal: any;
  }
}

export const PayPalButton: React.FC = () => {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ✅ On crée un intervalle pour vérifier si le script PayPal est chargé
    const interval = setInterval(() => {
      if (window.paypal && paypalRef.current) {
        // Dès qu'il est là, on arrête de vérifier
        clearInterval(interval);
        
        // On vide le conteneur pour éviter les doublons (si React recharge le composant)
        paypalRef.current.innerHTML = '';

        try {
          // On affiche le bouton hébergé PayPal
          window.paypal.HostedButtons({
            hostedButtonId: "W7684MWNUGDXL", // Ton ID de bouton
          }).render(paypalRef.current);
        } catch (error) {
          console.error("Erreur de rendu PayPal:", error);
        }
      }
    }, 500); // On vérifie toutes les 500ms

    // Nettoyage si le composant est démonté
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      ref={paypalRef} 
      style={{ 
        minHeight: '120px', // Hauteur minimale pour éviter que la page saute
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: '100%'
      }} 
    />
  );
};