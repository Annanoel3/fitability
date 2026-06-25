import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get request to extract timezone if provided
    const url = new URL(req.url);
    const providedTz = url.searchParams.get('timezone');

    // Update user's last activity timestamp and timezone if provided
    const profiles = await base44.entities.UserProfile.filter({ created_by_id: user.id });
    if (profiles.length > 0) {
      const updateData = { last_activity_date: new Date().toISOString() };
      if (providedTz) {
        updateData.timezone = providedTz;
      }
      await base44.entities.UserProfile.update(profiles[0].id, updateData);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});