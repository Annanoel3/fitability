import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import OpenAI from "npm:openai";

Deno.serve(async (req) => {
  await createClientFromRequest(req);
  const { audio_base64, filename, mimeType } = await req.json();
  if (!audio_base64) {
    return Response.json({ error: "Missing audio_base64" }, { status: 400 });
  }
  const binaryStr = atob(audio_base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const name = filename || "audio.m4a";
  const mt = mimeType || "audio/mp4";
  const type = mt.includes("webm") ? "audio/webm" : mt.includes("wav") ? "audio/wav" : mt.includes("mp3") ? "audio/mpeg" : "audio/mp4";
  const audioFile = new File([bytes], name, { type });
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  const transcription = await openai.audio.transcriptions.create({ file: audioFile, model: "whisper-1" });
  return Response.json({ text: transcription.text });
});