import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CATEGORIES = [
  { name: 'Amputee Rehabilitation', count: 30 },
  { name: 'Cardiac Rehabilitation', count: 30 },
  { name: 'Knee Conditions', count: 30 },
  { name: 'Hip Conditions', count: 30 },
  { name: 'Spinal Cord Injury / Wheelchair', count: 30 },
  { name: 'Asthma & Respiratory', count: 20 },
  { name: 'General Adaptive Strength & Mobility', count: 40 }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const categoryIndex = body.categoryIndex || 0;

    if (categoryIndex >= CATEGORIES.length) {
      return Response.json({ 
        success: true, 
        message: 'All categories completed' 
      });
    }

    const category = CATEGORIES[categoryIndex];

    const resp = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a JSON array (NOT wrapped in object) of exactly ${category.count} unique adaptive fitness exercises for the category: "${category.name}".

For the category, provide exercises across all difficulty levels (Beginner, Easy, Moderate, Advanced) and positions (Seated, Standing, Wheelchair, Lying down, Any) where appropriate.

FOR EACH EXERCISE INCLUDE:
- name (string, unique)
- description (2-3 sentences)
- instructions (5-10 detailed steps)
- category (Warmup|Strength|Cardio|Balance|Flexibility|Cooldown|Breathing|Recovery)
- position (Seated|Standing|Wheelchair|Lying down|Any)
- difficulty (Beginner|Easy|Moderate|Advanced)
- muscles_used (array)
- equipment_needed (array, can be [])
- restrictions (array)
- modifications (string)
- default_sets (number)
- default_reps (number or null)
- default_duration_seconds (number or null)
- safety_rating (Safe|Caution|Avoid)

RESPOND ONLY WITH A VALID JSON ARRAY. NO MARKDOWN WRAPPING. Start with "[" and end with "]".`,
      model: "claude_sonnet_4_6"
    });

    let respStr = typeof resp === 'string' ? resp : JSON.stringify(resp);
    respStr = respStr.replace(/```json\n?|\n?```/g, '').replace(/^```\n?|\n?```$/g, '').trim();
    
    let exercises = JSON.parse(respStr);
    if (!Array.isArray(exercises)) exercises = [];

    const sanitized = exercises.map(ex => ({
      ...ex,
      safety_rating: ex.safety_rating || "Safe",
      is_custom: false,
      muscles_used: Array.isArray(ex.muscles_used) ? ex.muscles_used : [],
      equipment_needed: Array.isArray(ex.equipment_needed) ? ex.equipment_needed : [],
      restrictions: Array.isArray(ex.restrictions) ? ex.restrictions : []
    }));

    const created = await base44.entities.Exercise.bulkCreate(sanitized);
    
    return Response.json({ 
      success: true,
      category: category.name,
      generated: created.length,
      nextCategoryIndex: categoryIndex + 1,
      message: `Generated ${created.length} exercises for ${category.name}. Call again with categoryIndex=${categoryIndex + 1} to continue.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});