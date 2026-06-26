import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// One-time: re-compute restriction_tags & capability_tags for all existing users
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { batch_size = 50, offset = 0 } = await req.json().catch(() => ({}));

    // Fetch users in batch
    const profiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', batch_size, offset);
    if (profiles.length === 0) return Response.json({ success: true, completed: true, total_processed: offset });

    // Re-compute tags for each profile
    let updated_count = 0;
    for (const profile of profiles) {
      try {
        await base44.asServiceRole.functions.invoke('computeUserTags', { 
          profile_id: profile.id 
        });
        updated_count++;
      } catch (e) {
        console.log(`Failed to compute tags for profile ${profile.id}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      batch_updated: updated_count,
      next_offset: offset + batch_size,
      completed: profiles.length < batch_size
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});