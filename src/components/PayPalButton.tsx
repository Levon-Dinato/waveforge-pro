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
    // On vérifie toutes les 500ms si le script PayPal est chargé
    const interval = setInterval(() => {
      if (window.paypal && paypalRef.current) {
        clearInterval(interval);
        paypalRef.current.innerHTML = ''; // On nettoie le conteneur

        try {
          window.paypal.Buttons({
            style: {
              shape: 'rect',
              color: 'gold',
              layout: 'vertical',
              label: 'subscribe'
            },
            createSubscription: function(data: any, actions: any) {
              return actions.subscription.create({
                // ✅ C'est ton ID de plan d'abonnement
                plan_id: 'P-6S823680KU642853FNLOLY7A' 
              });
            },
            onApprove: function(data: any, actions: any) {
              // ✅ Cette fonction se déclenche quand le paiement est validé
              alert(`Abonnement réussi ! ID : ${data.subscriptionID}`);
              
              // 💡 Plus tard : Envoie le data.subscriptionID à Supabase pour valider 
              // le compte Premium automatiquement
            }
          }).render(paypalRef.current);
        } catch (error) {
          console.error("Erreur d'affichage du bouton PayPal :", error);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      ref={paypalRef} 
      style={{ 
        minHeight: '150px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: '100%'
      }} 
    />
  );
};