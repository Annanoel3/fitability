import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, voice } = await req.json();
    if (!text) return Response.json({ error: 'text is required' }, { status: 400 });

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        voice: voice || "nova",
        input: text
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
      return Response.json({ error: err?.error?.message || response.statusText }, { status: 500 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Chunk-encode to avoid stack overflow on large audio
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      base64 += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    base64 = btoa(base64);

    return Response.json({ url: "data:audio/mpeg;base64," + base64 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});