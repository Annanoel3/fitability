import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, category } = await req.json();

    // Use OpenAI-free notification — log to console (visible in function logs)
    // SendEmail uses Base44 credits; swap for a webhook/SMTP solution when available
    console.log(`[NOTIFY] User: ${user.full_name || user.email} | Category: ${category} | Message: ${message}`);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});