import { base44 } from "@/api/base44Client";

const CLIP_MS = 2800;
const TARGET_SR = 16000;
const FRAME_MS = 30;
const SPEECH_RMS = 0.03;
const MIN_SPEECH_FRAMES = 3;

function getVR() {
  try { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VoiceRecorder) || null; }
  catch (e) { return null; }
}

export function isSpeechSupported() {
  return !!getVR();
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let _ctx = null;
function audioCtx() {
  if (!_ctx) { const AC = window.AudioContext || window.webkitAudioContext; _ctx = new AC(); }
  return _ctx;
}

async function decodeToMono(bytes) {
  const buf = await audioCtx().decodeAudioData(bytes.buffer.slice(0));
  return { data: buf.getChannelData(0), sampleRate: buf.sampleRate };
}

function downsample(data, srcSR) {
  if (srcSR <= TARGET_SR) return data.slice(0);
  const ratio = srcSR / TARGET_SR;
  const outLen = Math.floor(data.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0, n = 0;
    for (let j = start; j < end && j < data.length; j++) { sum += data[j]; n++; }
    out[i] = n ? sum / n : 0;
  }
  return out;
}

function hasSpeech(data, sr) {
  const frame = Math.max(1, Math.floor((FRAME_MS / 1000) * sr));
  let speechFrames = 0;
  for (let i = 0; i + frame <= data.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += data[j] * data[j];
    if (Math.sqrt(sum / frame) > SPEECH_RMS) { speechFrames++; if (speechFrames >= MIN_SPEECH_FRAMES) return true; }
  }
  return false;
}

function encodeWavBase64(data, sr) {
  const len = data.length;
  const buffer = new ArrayBuffer(44 + len * 2);
  const view = new DataView(buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, 36 + len * 2, true); w(8, "WAVE");
  w(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, "data"); view.setUint32(40, len * 2, true);
  let off = 44;
  for (let i = 0; i < len; i++) { const s = Math.max(-1, Math.min(1, data[i])); view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2; }
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function concatF32(a, b) {
  const out = new Float32Array(a.length + b.length);
  out.set(a, 0); out.set(b, a.length);
  return out;
}

async function transcribeWav(wavB64) {
  const res = await base44.functions.invoke("transcribeAudio", { audio_base64: wavB64, filename: "audio.wav", mimeType: "audio/wav" });
  const data = res && res.data ? res.data : res;
  return ((data && data.text) || "").trim();
}

export function createSpeechRecognizer(clipMs) {
  const vr = getVR();
  let aborted = false;
  let finished = false;
  let started = false;

  const shim = { onstart: null, onresult: null, onerror: null, onend: null,
    async start() {
      aborted = false; finished = false;
      if (!vr) { emitError("audio-capture"); emitEnd(); return; }
      try {
        let granted = (await vr.hasAudioRecordingPermission()).value;
        if (!granted) granted = (await vr.requestAudioRecordingPermission()).value;
        if (!granted) { emitError("not-allowed"); emitEnd(); return; }
      } catch (e) { emitError("not-allowed"); emitEnd(); return; }
      try { if (audioCtx().state === "suspended") await audioCtx().resume(); } catch (e) {}

      let prev16 = new Float32Array(0);
      let lastText = ""; let lastAt = 0;

      while (!aborted) {
        try { await vr.startRecording(); }
        catch (e) { try { await vr.stopRecording(); } catch (e2) {} await wait(200); continue; }
        if (!started) { started = true; if (shim.onstart) shim.onstart(); }

        await wait(clipMs || CLIP_MS);
        if (aborted) { safeStop(); break; }

        let val = null;
        try { const rec = await vr.stopRecording(); val = rec && rec.value ? rec.value : rec; }
        catch (e) { await wait(150); continue; }
        if (aborted) break;

        const b64 = val && val.recordDataBase64;
        if (!b64) continue;

        let cur16 = null;
        try { const dec = await decodeToMono(b64ToBytes(b64)); cur16 = downsample(dec.data, dec.sampleRate); }
        catch (e) { prev16 = new Float32Array(0); continue; }
        if (aborted) break;

        if (hasSpeech(cur16, TARGET_SR)) {
          const merged = concatF32(prev16, cur16);
          let text = "";
          try { text = await transcribeWav(encodeWavBase64(merged, TARGET_SR)); } catch (e) { text = ""; }
          if (aborted) break;
          if (text) {
            const now = Date.now();
            const norm = text.toLowerCase().replace(/[^a-z ]/g, "").trim();
            if (!(norm === lastText && now - lastAt < 2500)) {
              lastText = norm; lastAt = now;
              if (shim.onresult) shim.onresult({ results: [[{ transcript: text }]] });
            }
          }
          prev16 = new Float32Array(0);
        } else {
          prev16 = cur16;
        }
      }
      emitEnd();
    },
    abort() { aborted = true; safeStop(); emitEnd(); },
  };

  function emitError(code) { if (shim.onerror) { try { shim.onerror({ error: code }); } catch (e) {} } }
  function emitEnd() { if (finished) return; finished = true; if (shim.onend) { try { shim.onend(); } catch (e) {} } }
  function safeStop() { try { if (vr) vr.stopRecording().catch(function () {}); } catch (e) {} }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  return shim;
}

export async function recordAndTranscribe(windowMs) {
  const vr = getVR();
  if (!vr) return "";
  try {
    let granted = (await vr.hasAudioRecordingPermission()).value;
    if (!granted) granted = (await vr.requestAudioRecordingPermission()).value;
    if (!granted) return "";
    try { if (audioCtx().state === "suspended") await audioCtx().resume(); } catch (e) {}
    await vr.startRecording();
    await new Promise((r) => setTimeout(r, windowMs || 7000));
    let val = null;
    try { const rec = await vr.stopRecording(); val = rec && rec.value ? rec.value : rec; } catch (e) { return ""; }
    const b64 = val && val.recordDataBase64;
    if (!b64) return "";
    let pcm = null;
    try { const dec = await decodeToMono(b64ToBytes(b64)); pcm = downsample(dec.data, dec.sampleRate); } catch (e) { return ""; }
    if (!hasSpeech(pcm, TARGET_SR)) return "";
    try { return await transcribeWav(encodeWavBase64(pcm, TARGET_SR)); } catch (e) { return ""; }
  } catch (e) { return ""; }
}

export function listenForAnswer(timeoutMs, clipMs) {
  return new Promise((resolve) => {
    const rec = createSpeechRecognizer(clipMs);
    if (!rec) { resolve(""); return; }
    let done = false;
    const finish = (t) => {
      if (done) return;
      done = true;
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try { rec.abort(); } catch (e) {}
      resolve(t || "");
    };
    rec.onresult = (e) => {
      try { finish(e.results[0][0].transcript); } catch (err) { finish(""); }
    };
    rec.onerror = () => {};
    rec.onend = () => { finish(""); };
    try { rec.start(); } catch (e) { finish(""); }
    setTimeout(() => finish(""), timeoutMs || 15000);
  });
}

export function listenUntilPause(timeoutMs, clipMs, pauseMs) {
  return new Promise((resolve) => {
    const rec = createSpeechRecognizer(clipMs);
    if (!rec) { resolve(""); return; }
    const parts = [];
    let done = false;
    let pauseTimer = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (pauseTimer) clearTimeout(pauseTimer);
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try { rec.abort(); } catch (e) {}
      resolve(parts.join(" ").trim());
    };
    rec.onresult = (e) => {
      try { parts.push(e.results[0][0].transcript); } catch (err) {}
      if (pauseTimer) clearTimeout(pauseTimer);
      pauseTimer = setTimeout(finish, pauseMs || 2500);
    };
    rec.onerror = () => {};
    rec.onend = () => { finish(); };
    try { rec.start(); } catch (e) { finish(); }
    setTimeout(finish, timeoutMs || 20000);
  });
}

// Active capture session — session-based so stopCapture always targets the right
// session (not a shared boolean that a new captureOnce can clobber), and starting a
// new capture stops any existing one (prevents mic conflicts with audio-assist / VoiceOnboarding).
let _activeSession = null;

export function stopCapture() {
  if (_activeSession) _activeSession.aborted = true;
}

export async function captureOnce(maxMs, minMs) {
  const vr = getVR();
  if (!vr) return "";
  // Stop any existing capture session before starting a new one
  if (_activeSession) {
    _activeSession.aborted = true;
    await new Promise(r => setTimeout(r, 300));
  }
  const session = { aborted: false };
  _activeSession = session;
  try {
    let granted = (await vr.hasAudioRecordingPermission()).value;
    if (!granted) granted = (await vr.requestAudioRecordingPermission()).value;
    if (!granted) return "";
    try { if (audioCtx().state === "suspended") await audioCtx().resume(); } catch (e) {}
    try { await vr.startRecording(); } catch (e) { return ""; }
    const start = Date.now();
    const cap = maxMs || 9000;
    const floor = minMs || 1200;
    while (Date.now() - start < cap) {
      await new Promise((r) => setTimeout(r, 100));
      if (session.aborted && Date.now() - start >= floor) break;
    }
    // If another session took over (it already stopped the recorder), bail out
    if (_activeSession !== session) return "";
    let val = null;
    try { const rec = await vr.stopRecording(); val = rec && rec.value ? rec.value : rec; }
    catch (e) { return ""; }
    // Clear the active session if it's still us
    if (_activeSession === session) _activeSession = null;
    const b64 = val && val.recordDataBase64;
    if (!b64) return "";
    let pcm = null;
    try { const dec = await decodeToMono(b64ToBytes(b64)); pcm = downsample(dec.data, dec.sampleRate); }
    catch (e) { return ""; }
    if (!hasSpeech(pcm, TARGET_SR)) return "";
    try { return await transcribeWav(encodeWavBase64(pcm, TARGET_SR)); } catch (e) { return ""; }
  } catch (e) { return ""; }
}