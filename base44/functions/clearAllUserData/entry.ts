import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    // Clear user-specific data; keep Exercise library intact (shared)
    const entities = [
      'UserProfile',
      'WorkoutPlan',
      'PainLog',
      'ProgressLog',
      'SymptomLog',
      'SavedWorkout',
      'DeletedExercise',
      'CaregiverLink'
    ];

    const results = {};
    for (const entity of entities) {
      try {
        const records = await base44.asServiceRole.entities[entity].list('-created_date', 500);
        for (const record of records) {
          await base44.asServiceRole.entities[entity].delete(record.id);
        }
        results[entity] = records.length;
      } catch (e) {
        results[entity] = `error: ${e.message}`;
      }
    }

    return Response.json({
      success: true,
      message: 'All user data cleared — ready for fresh testing',
      deleted: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});