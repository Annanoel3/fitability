export function getNativeSR() {
  return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
    ? (window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition) || null
    : null;
}

export function getWebSR() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechSupported() {
  return !!(getNativeSR() || getWebSR());
}

export function createSpeechRecognizer() {
  const nativeSR = getNativeSR();

  if (nativeSR) {
    // Native Capacitor plugin shim
    return createNativeSpeechShim(nativeSR);
  }

  const webSR = getWebSR();
  if (webSR) {
    // Web Speech API — use as-is
    const recognition = new webSR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    return recognition;
  }

  return null;
}

function createNativeSpeechShim(plugin) {
  let lastTranscript = '';
  let aborted = false;
  let finalized = false;
  let listeners = [];

  const shim = {
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,

    async start() {
      aborted = false;
      finalized = false;
      lastTranscript = '';

      try {
        // Check permissions
        const permissions = await plugin.checkPermissions();
        if (permissions.speechRecognition !== 'granted') {
          const reqResult = await plugin.requestPermissions();
          if (reqResult.speechRecognition !== 'granted') {
            if (this.onerror) {
              this.onerror({ error: 'not-allowed' });
            }
            if (this.onend) {
              this.onend();
            }
            return;
          }
        }

        // Register listeners
        const partialListener = await plugin.addListener('partialResults', (data) => {
          if (data && data.matches && data.matches[0]) {
            lastTranscript = data.matches[0];
          }
        });
        listeners.push(partialListener);

        const stateListener = await plugin.addListener('listeningState', (data) => {
          if (data.status === 'started') {
            if (shim.onstart) {
              shim.onstart();
            }
          } else if (data.status === 'stopped') {
            finalize();
          }
        });
        listeners.push(stateListener);

        // Start recognition
        await plugin.start({
          language: 'en-US',
          maxResults: 2,
          partialResults: true,
          popup: false
        });
      } catch (e) {
        if (this.onend) {
          this.onend();
        }
      }
    },

    async abort() {
      aborted = true;
      try {
        await plugin.stop();
      } catch (e) {}
      finalize();
    },

    stop() {
      this.abort();
    }
  };

  function finalize() {
    if (finalized) return;
    finalized = true;

    // Remove listeners
    listeners.forEach(listener => {
      try {
        listener.remove();
      } catch (e) {}
    });
    listeners = [];

    // Call onresult only if not aborted and has transcript
    if (!aborted && lastTranscript) {
      if (shim.onresult) {
        shim.onresult({
          results: [[{ transcript: lastTranscript }]]
        });
      }
    }

    // Always call onend
    if (shim.onend) {
      shim.onend();
    }
  }

  return shim;
}