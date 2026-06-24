import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Single comprehensive call to generate 200+ exercises
    const resp = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert adaptive fitness specialist. Generate a JSON array (NOT wrapped in an object) of 200+ adaptive fitness exercises across ALL these categories:

CATEGORIES (aim for 25-35 exercises per category):
1. Amputee Rehabilitation (above-knee, below-knee, upper limb - all stages)
2. Cardiac Rehabilitation (phases 1-4, post-MI, heart failure, valve surgery)
3. Knee Conditions (arthritis, ACL, meniscus, post-replacement rehab)
4. Hip Conditions (arthritis, FAI, labral tears, post-replacement rehab)
5. Spinal Cord Injury / Wheelchair (paraplegia, tetraplegia, wheelchair sports)
6. Asthma & Respiratory (breathing, low-intensity cardio, bronchial management)
7. General Adaptive Strength & Mobility (seated, standing, lying, flexibility, balance, warmup, cooldown)

FOR EACH EXERCISE INCLUDE (in JSON):
- name (string)
- description (2-3 sentences on what it does and who benefits)
- instructions (5-10 detailed steps with specific positions, movements, tempo)
- category (Warmup|Strength|Cardio|Balance|Flexibility|Cooldown|Breathing|Recovery)
- position (Seated|Standing|Wheelchair|Lying down|Any)
- difficulty (Beginner|Easy|Moderate|Advanced)
- muscles_used (array like ["Quadriceps", "Core"])
- equipment_needed (array, empty for bodyweight)
- restrictions (array like ["Severe knee pain", "Recent hip surgery"])
- modifications (string describing easier/harder versions)
- default_sets (number)
- default_reps (number or null)
- default_duration_seconds (number or null)
- safety_rating (Safe|Caution|Avoid)

RESPOND ONLY WITH A VALID JSON ARRAY. NO MARKDOWN, NO WRAPPER OBJECT. Start with "[" and end with "]".`,
      model: "claude_sonnet_4_6"
    });

    // Parse the response, handling markdown wrapping
    let respStr = typeof resp === 'string' ? resp : JSON.stringify(resp);
    respStr = respStr.replace(/```json\n?|\n?```/g, '').replace(/^```\n?|\n?```$/g, '').trim();
    
    let exercises = [];
    try {
      exercises = JSON.parse(respStr);
    } catch (e) {
      return Response.json({ error: `Failed to parse LLM response: ${e.message}` }, { status: 500 });
    }

    if (!Array.isArray(exercises)) {
      return Response.json({ error: 'LLM did not return a valid array' }, { status: 500 });
    }

    // Sanitize exercises
    const sanitized = exercises.map(ex => ({
      ...ex,
      safety_rating: ex.safety_rating || "Safe",
      is_custom: false,
      muscles_used: Array.isArray(ex.muscles_used) ? ex.muscles_used : [],
      equipment_needed: Array.isArray(ex.equipment_needed) ? ex.equipment_needed : [],
      restrictions: Array.isArray(ex.restrictions) ? ex.restrictions : []
    }));

    // Bulk create
    const created = await base44.entities.Exercise.bulkCreate(sanitized);
    
    return Response.json({ 
      success: true, 
      message: `Generated and imported ${created.length} adaptive exercises`,
      count: created.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});