import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { text, voice = 'alloy' } = await request.json() as { text: string; voice?: string };
  if (!text?.trim()) return new Response('text required', { status: 400 });

  // ElevenLabs
  if (process.env.ELEVENLABS_API_KEY) {
    const voiceId = process.env.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB';
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (res.ok) return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' } });
  }

  // OpenAI TTS fallback
  if (process.env.OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'tts-1', input: text.slice(0, 4096), voice }),
    });
    if (res.ok) return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' } });
  }

  // Neither configured — client should use Web Speech Synthesis
  return new Response(JSON.stringify({ error: 'No TTS provider configured', fallback: 'web_speech' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
}
