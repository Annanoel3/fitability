import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// List of exercise names that came from user-provided resources
const SOURCE_EXERCISES = [
  "Wall Seats",
  "Single-Leg Deadlift",
  "Hip Bridges",
  "Hamstring Stretch",
  "Wall Press",
  "Seated Chest Press",
  "Step Ups",
  "Side Steps",
  "Seated Triceps Dips",
  "Half Squat",
  "Brisk Walking",
  "Cycling",
  "Swimming",
  "Back Row (Wheelchair)",
  "Bicep Curl (Wheelchair)",
  "Lat Pulldown (Wheelchair)",
  "Hip Abduction Stretch",
  "Quad Sets",
  "Hip Extension",
  "Shoulder Press (Seated)",
  "Standing Knee Raises",
  "Shoulder Shrugs"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allExercises = await base44.entities.Exercise.list();
    const toDelete = allExercises.filter(ex => !SOURCE_EXERCISES.includes(ex.name));

    // Delete non-source exercises
    for (const ex of toDelete) {
      await base44.entities.Exercise.delete(ex.id);
    }

    return Response.json({ 
      success: true, 
      deleted: toDelete.length,
      deletedNames: toDelete.map(ex => ex.name),
      retained: SOURCE_EXERCISES.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});