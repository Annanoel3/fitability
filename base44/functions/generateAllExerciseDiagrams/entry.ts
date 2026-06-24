import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    for (const exercise of toProcess) {
      try {
        const prompt = `Create a minimalist, instructional fitness exercise diagram for "${exercise.name}". Show a simple stick figure or anatomical outline demonstrating the exercise position and movement. Include key body angles, joint positions, and directional arrows for movement. Style: medical/instructional, clean lines, educational. Position: ${exercise.position}. No background, transparent if possible.`;

        const res = await base44.integrations.Core.GenerateImage({
          prompt
        });

        if (res.url) {
          await base44.entities.Exercise.update(exercise.id, { diagram_url: res.url });
          generated++;
          console.log(`Generated diagram for: ${exercise.name}`);
        }
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