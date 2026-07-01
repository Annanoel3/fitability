import { base44 } from "@/api/base44Client";

// How long (ms) we record before sending the clip to Whisper.
const WINDOW_MS = 4000;

function getVR() {
  try {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VoiceRecorder) || null;
  } catch (e) { return null; }
}

// Voice is supported when the native VoiceRecorder plugin is present in the wrapper.
export function isSpeechSupported() {
  return !!getVR();
}

// Transcribe a base64 audio clip via our own transcribeAudio function (OpenAI key, no base44 credits).
async function transcribe(recordDataBase64, mimeType) {
  const mt = mimeType || "audio/aac";
  const ext = mt.includes("webm") ? "webm" : mt.includes("wav") ? "wav" : mt.includes("mp3") ? "mp3" : "m4a";
  const res = await base44.functions.invoke("transcribeAudio", {
    audio_base64: recordDataBase64,
    filename: "audio." + ext,
    mimeType: mt,
  });
  const data = res && res.data ? res.data : res;
  return ((data && data.text) || "").trim();
}

// Returns a recognizer with the same interface the app already uses
// (onstart / onresult / onerror / onend, start() / abort()), backed by
// record-a-window -> OpenAI Whisper instead of the native SpeechRecognizer.
export function createSpeechRecognizer() {
  const vr = getVR();
  let aborted = false;
  let finished = false;

  const shim = { onstart: null, onresult: null, onerror: null, onend: null,
    async start() {
      aborted = false;
      finished = false;
      if (!vr) { emitError("audio-capture"); emitEnd(); return; }
      try {
        let granted = false;
        try { granted = (await vr.hasAudioRecordingPermission()).value; } catch (e) { granted = false; }
        if (!granted) { try { granted = (await vr.requestAudioRecordingPermission()).value; } catch (e) { granted = false; } }
        if (!granted) { emitError("not-allowed"); emitEnd(); return; }

        try { await vr.startRecording(); }
        catch (e) { try { await vr.stopRecording(); } catch (e2) {} emitError("audio-capture"); emitEnd(); return; }

        if (aborted) { safeStop(); return; }
        if (shim.onstart) shim.onstart();

        await wait(WINDOW_MS);
        if (aborted) return;

        let val = null;
        try { const rec = await vr.stopRecording(); val = rec && rec.value ? rec.value : rec; }
        catch (e) { emitError("no-speech"); emitEnd(); return; }
        if (aborted) return;

        const b64 = val && val.recordDataBase64;
        const dur = val && typeof val.msDuration === "number" ? val.msDuration : null;
        if (!b64 || (dur !== null && dur < 350)) { emitError("no-speech"); emitEnd(); return; }

        let text = "";
        try { text = await transcribe(b64, val.mimeType); }
        catch (e) { emitError("network"); emitEnd(); return; }
        if (aborted) return;

        if (text) { if (shim.onresult) shim.onresult({ results: [[{ transcript: text }]] }); }
        else { emitError("no-speech"); }
        emitEnd();
      } catch (e) { emitError("audio-capture"); emitEnd(); }
    },
    abort() { aborted = true; safeStop(); emitEnd(); },
  };

  function emitError(code) { if (shim.onerror) { try { shim.onerror({ error: code }); } catch (e) {} } }
  function emitEnd() { if (finished) return; finished = true; if (shim.onend) { try { shim.onend(); } catch (e) {} } }
  function safeStop() { try { if (vr) vr.stopRecording().catch(function () {}); } catch (e) {} }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  return shim;
}