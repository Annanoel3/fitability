import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Update user's last activity timestamp
    const profiles = await base44.entities.UserProfile.filter({ created_by_id: user.id });
    if (profiles.length > 0) {
      await base44.entities.UserProfile.update(profiles[0].id, {
        last_activity_date: new Date().toISOString()
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});