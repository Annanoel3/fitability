import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, voice } = await req.json();
    if (!text) return Response.json({ error: 'Missing text' }, { status: 400 });

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice || "nova",
      input: text
    });
    const bytes = new Uint8Array(await speech.arrayBuffer());

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const bucket = "FitAbility exercises";
    const filename = crypto.randomUUID() + ".mp3";
    const encodedPath = encodeURIComponent(bucket) + "/" + filename;

    const up = await fetch(SUPABASE_URL + "/storage/v1/object/" + encodedPath, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + KEY,
        "apikey": KEY,
        "Content-Type": "audio/mpeg",
        "x-upsert": "true"
      },
      body: bytes
    });

    if (!up.ok) {
      const err = await up.text();
      return Response.json({ error: "Supabase upload failed: " + err }, { status: 500 });
    }

    const url = SUPABASE_URL + "/storage/v1/object/public/" + encodeURIComponent(bucket) + "/" + filename;
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
  }
});