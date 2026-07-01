import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

    // Generate image via DALL-E 3 using user's OpenAI key
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024"
    });
    const url = res.data[0]?.url;

    if (!url) {
      return Response.json({ error: 'Failed to generate image' }, { status: 500 });
    }

    // Persist the image URL by storing it in ExerciseImage entity
    // This prevents DALL-E URLs from expiring (they only last ~1 hour)
    // The caller is responsible for creating the ExerciseImage record with the returned URL
    
    return Response.json({ url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});