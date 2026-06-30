import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt, response_json_schema } = await req.json();
    if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const fullPrompt = response_json_schema
      ? prompt + '\n\nRespond with ONLY a valid JSON object that exactly matches this JSON schema (no markdown, no extra text):\n' + JSON.stringify(response_json_schema)
      : prompt;

    const rawResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: fullPrompt }],
      response_format: { type: "json_object" },
      max_tokens: 8000
    });

    const parsed = JSON.parse(rawResponse.choices[0].message.content || "{}");
    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});