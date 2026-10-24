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
    const interval = setInterval(() => {
      if (window.paypal && paypalRef.current) {
        clearInterval(interval);
        paypalRef.current.innerHTML = '';

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
                plan_id: 'P-6S823680KU642853FNLOLY7A' // Ton Plan ID annuel
              });
            },
            onApprove: function(data: any, actions: any) {
              // ✅ Message de succès clair
              alert(`Félicitations ! Votre abonnement Premium de 1 an est activé.\n\nID d'abonnement : ${data.subscriptionID}\n\nVotre accès sera débloqué très prochainement.`);
              
              // 💡 Recharge la page pour que l'utilisateur voie son espace (une fois validé manuellement par toi)
              window.location.reload();
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