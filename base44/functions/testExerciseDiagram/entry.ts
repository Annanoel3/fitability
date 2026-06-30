import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { exercise_name } = await req.json();
    
    if (!exercise_name) {
      return Response.json({ error: 'exercise_name required' }, { status: 400 });
    }

    const prompt = `Create a minimalist instructional diagram showing how to perform the "${exercise_name}" exercise. Use simple geometric shapes and stick figures with clean lines and movement arrows. No realistic people, faces, or hands. Style: clinical/educational diagram, black and white or simple colors, viewed from a clear angle showing the full body position and movement. This is for adaptive fitness coaching.`;

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024"
    });

    return Response.json({ 
      url: image.data[0]?.url,
      prompt: prompt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});