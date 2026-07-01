import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get exercises to process (batch of 20 per call)
    const exercises = await base44.entities.Exercise.list('-created_date', 500);
    const needsDiagrams = exercises.filter(ex => !ex.diagram_url);
    
    // Allow override to process just N exercises
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 20;
    const toProcess = needsDiagrams.slice(0, limit);

    console.log(`Processing ${toProcess.length} of ${needsDiagrams.length} exercises needing diagrams`);

    let generated = 0;
    let failed = 0;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const bucket = "FitAbility exercises";

    for (const exercise of toProcess) {
      try {
        const prompt = `Create a minimalist, instructional fitness exercise diagram for "${exercise.name}". Show a simple stick figure or anatomical outline demonstrating the exercise position and movement. Include key body angles, joint positions, and directional arrows for movement. Style: medical/instructional, clean lines, educational. Position: ${exercise.position}. No background, transparent if possible.`;

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
          failed++;
          console.error(`Failed to generate image data for ${exercise.name}`);
          continue;
        }

        // Decode base64 to bytes
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

        // Upload to Supabase Storage
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
          failed++;
          console.error(`Supabase upload failed for ${exercise.name}: ${await up.text()}`);
          continue;
        }

        // Store permanent public URL
        const url = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${filename}`;
        await base44.entities.Exercise.update(exercise.id, { diagram_url: url });
        generated++;
        console.log(`Generated diagram for: ${exercise.name}`);
      } catch (e) {
        failed++;
        console.error(`Failed to generate diagram for ${exercise.name}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      total_exercises: exercises.length,
      remaining_needing_diagrams: needsDiagrams.length - toProcess.length,
      processed: toProcess.length,
      generated,
      failed,
      message: `Processed batch: ${generated} generated, ${failed} failed. ${needsDiagrams.length - toProcess.length} remaining.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});