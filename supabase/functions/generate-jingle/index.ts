// supabase/functions/generate-jingle/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders })
    }

    // Vérification Premium
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    if (!profile?.is_premium) {
      return new Response(JSON.stringify({ error: 'Accès réservé aux membres Premium' }), { status: 403, headers: corsHeaders })
    }

    const { text, voice } = await req.json()
    if (!text) {
      return new Response(JSON.stringify({ error: 'Texte manquant' }), { status: 400, headers: corsHeaders })
    }

    // Appel à votre Worker Cloudflare
    const workerUrl = Deno.env.get('CLOUDFLARE_TTS_URL')
    const workerKey = Deno.env.get('CLOUDFLARE_TTS_KEY')

    if (!workerUrl || !workerKey) {
      throw new Error("Configuration Cloudflare manquante dans les secrets Supabase.")
    }

    const ttsResponse = await fetch(`${workerUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workerKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        voice: voice || "fr-FR-DeniseNeural"
      })
    })

    if (!ttsResponse.ok) {
        const errText = await ttsResponse.text()
        throw new Error(`Erreur du Worker Edge TTS: ${errText}`)
    }

    const audioBlob = await ttsResponse.blob()

    // Upload sur Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileName = `jingles/${user.id}-${Date.now()}.mp3`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(fileName, audioBlob, { contentType: 'audio/mpeg' })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabaseAdmin.storage.from('media').getPublicUrl(fileName)

    return new Response(JSON.stringify({ audioUrl: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})