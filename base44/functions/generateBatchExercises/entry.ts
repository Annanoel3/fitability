import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

const CATEGORIES = [
  { name: 'Amputee Rehabilitation', count: 10 },
  { name: 'Cardiac Rehabilitation', count: 10 },
  { name: 'Knee Conditions', count: 10 },
  { name: 'Hip Conditions', count: 10 },
  { name: 'Spinal Cord Injury / Wheelchair', count: 10 },
  { name: 'Asthma & Respiratory', count: 8 },
  { name: 'General Adaptive Strength & Mobility', count: 12 }
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
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const message = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `Generate exactly ${category.count} adaptive fitness exercises for: "${category.name}".

For EACH exercise, output in this exact format (one per line, fields separated by |||):
NAME|||DESCRIPTION|||INSTRUCTIONS|||CATEGORY|||POSITION|||DIFFICULTY|||MUSCLES|||EQUIPMENT|||RESTRICTIONS|||MODIFICATIONS|||SETS|||REPS|||DURATION_SECONDS|||SAFETY_RATING

Where:
- DESCRIPTION: 1-2 sentences
- INSTRUCTIONS: step-by-step on a single line
- CATEGORY: Warmup|Strength|Cardio|Balance|Flexibility|Cooldown|Breathing|Recovery
- POSITION: Seated|Standing|Wheelchair|Lying down|Any
- DIFFICULTY: Beginner|Easy|Moderate|Advanced
- MUSCLES: comma-separated muscle names
- EQUIPMENT: comma-separated or NONE
- RESTRICTIONS: comma-separated or NONE
- MODIFICATIONS: single line
- SETS: number
- REPS: number or NULL
- DURATION_SECONDS: number or NULL
- SAFETY_RATING: Safe|Caution|Avoid

Output ONLY the lines. No preamble. ${category.count} lines exactly.`
      }]
    });

    const resp = message.choices[0].message.content;
    const lines = resp.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return Response.json({ error: 'No exercises generated' }, { status: 500 });
    }

    const exercises = lines.map(line => {
      const parts = line.split('|||');
      if (parts.length < 5) return null;

      return {
        name: (parts[0] || '').trim(),
        description: (parts[1] || '').trim(),
        instructions: (parts[2] || '').trim(),
        category: (parts[3] || 'Strength').trim(),
        position: (parts[4] || 'Any').trim(),
        difficulty: (parts[5] || 'Easy').trim(),
        muscles_used: parts[6] ? parts[6].split(',').map(m => m.trim()).filter(m => m && m !== 'NONE') : [],
        equipment_needed: parts[7] ? parts[7].split(',').map(e => e.trim()).filter(e => e && e !== 'NONE') : [],
        restrictions: parts[8] ? parts[8].split(',').map(r => r.trim()).filter(r => r && r !== 'NONE') : [],
        modifications: (parts[9] || 'Modify as needed').trim(),
        default_sets: parts[10] ? parseInt(parts[10]) : 1,
        default_reps: parts[11] && parts[11].trim() !== 'NULL' ? parseInt(parts[11]) : null,
        default_duration_seconds: parts[12] && parts[12].trim() !== 'NULL' ? parseInt(parts[12]) : null,
        safety_rating: (parts[13] || 'Safe').trim(),
        is_custom: false
      };
    }).filter(ex => ex && ex.name && ex.name.length > 0);

    if (exercises.length === 0) {
      return Response.json({ error: 'Failed to parse exercises' }, { status: 500 });
    }

    const created = await base44.entities.Exercise.bulkCreate(exercises);
    
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