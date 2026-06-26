import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'update') {
      return Response.json({ success: false, message: 'Not an update event' });
    }

    const userId = data.created_by_id;
    const today = new Date().toISOString().split("T")[0];

    // Check if there's a workout already planned for today
    const todayWorkouts = await base44.asServiceRole.entities.WorkoutPlan.filter({
      created_by_id: userId,
      date: today
    });

    // Delete today's workout so a new one can be generated
    for (const workout of todayWorkouts) {
      await base44.asServiceRole.entities.WorkoutPlan.delete(workout.id);
    }

    return Response.json({ 
      success: true,
      message: "Today's workout cleared after profile change; it will be regenerated safely on the next dashboard visit."
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});