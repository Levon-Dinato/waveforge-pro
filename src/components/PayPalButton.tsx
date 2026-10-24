// src/components/PayPalButton.tsx
import React, { useEffect, useRef } from 'react';

// On déclare window.paypal pour éviter les erreurs TypeScript
declare global {
  interface Window {
    paypal: any;
  }
}

export const PayPalButton: React.FC = () => {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // On s'assure que le script PayPal est chargé et que le conteneur existe
    if (window.paypal && paypalRef.current) {
      
      // On vide le conteneur au cas où (utile pour le Hot Reload de React)
      paypalRef.current.innerHTML = '';

      // ✅ C'est ici qu'on utilise le code de la "Partie 2" de ton écran
      window.paypal.HostedButtons({
        hostedButtonId: "W7684MWNUGDXL", 
      }).render(paypalRef.current);
    }
  }, []);

  return (
    <div 
      ref={paypalRef} 
      style={{ 
        minHeight: '150px', 
        display: 'flex', 
        justifyContent: 'center', 
        marginTop: '20px' 
      }} 
    />
  );
};