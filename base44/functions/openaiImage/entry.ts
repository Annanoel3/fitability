import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

    // Generate image via DALL-E 3 in base64 format
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    });
    
    const b64 = res.data[0]?.b64_json;
    if (!b64) {
      return Response.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    // Decode base64 to bytes
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const bucket = "FitAbility exercises";
    const filename = `${crypto.randomUUID()}.png`;
    const encodedPath = `${encodeURIComponent(bucket)}/${filename}`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodedPath}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "apikey": KEY,
        "Content-Type": "image/png",
        "x-upsert": "true"
      },
      body: bytes
    });

    if (!up.ok) {
      const err = await up.text();
      return Response.json({ error: `Supabase upload failed: ${err}` }, { status: 500 });
    }

    // Return permanent public URL
    const url = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${filename}`;
    return Response.json({ url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});