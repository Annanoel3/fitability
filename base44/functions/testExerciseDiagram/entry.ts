import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const { exercise_name } = await req.json();
    
    if (!exercise_name) {
      return Response.json({ error: 'exercise_name required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const prompt = `Create a minimalist instructional diagram showing how to perform the "${exercise_name}" exercise. Use simple geometric shapes and stick figures with clean lines and movement arrows. No realistic people, faces, or hands. Style: clinical/educational diagram, black and white or simple colors, viewed from a clear angle showing the full body position and movement. This is for adaptive fitness coaching.`;

    const image = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });

    return Response.json({ 
      url: image.data[0].url,
      prompt: prompt
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});