// api/stems.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ⚠️ METS TA CLÉ API ICI (celle de Runware)
  const API_KEY = 'TA_CLE_API_RUNWARE_ICI'; 

  try {
    // Note : Runware ne fait pas de séparation de stems nativement.
    // On utilise ici l'API de Replicate ou Hugging Face en arrière-plan.
    // Si tu préfères utiliser Replicate, dis-le moi, je te donnerai le code exact.
    
    return res.status(501).json({ 
      error: "L'API de séparation de stems n'est pas encore configurée. Reviens bientôt !" 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}