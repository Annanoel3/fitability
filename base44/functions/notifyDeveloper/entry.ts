import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, category } = await req.json();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "juliheaton@msn.com",
      subject: `FitAbility Coach: ${category === "out_of_scope" ? "Feature Request / Out-of-Scope Ask" : "User Feedback"} from ${user.full_name || user.email}`,
      body: `A user interaction requires your attention.\n\nUser: ${user.full_name || "Unknown"} (${user.email})\nCategory: ${category}\n\nMessage:\n${message}\n\n---\nSent automatically by the FitAbility Coach.`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});