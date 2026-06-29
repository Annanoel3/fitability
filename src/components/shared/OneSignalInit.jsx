import { useEffect } from 'react';

const ONESIGNAL_APP_ID = '067a47c8-a2c2-4307-8461-a329aaff6a2b';

function isRunningInCapacitor() {
  return window.Capacitor?.isNativePlatform?.() ?? false;
}

export default function OneSignalInit({ user }) {
  useEffect(() => {
    const syncOneSignal = async () => {
      if (!user) return;
      const userEmail = user?.email;
      let externalId;
      if (userEmail && userEmail.includes('@')) {
        externalId = userEmail;
      } else if (user?.id) {
        externalId = `${user.id}@fitability.app`;
      } else {
        return;
      }
      if (isRunningInCapacitor()) {
        const NotifyBridge = window.Capacitor?.Plugins?.NotifyBridge;
        if (!NotifyBridge) return;
        if (externalId) {
           try { await NotifyBridge.requestPermission(); } catch (e) {}
           try {
             if (window.Capacitor?.Plugins?.Microphone) {
               window.Capacitor.Plugins.Microphone.requestPermissions().catch(() => {});
             } else {
               navigator.mediaDevices?.getUserMedia({ audio: true })
                 .then(stream => stream.getTracks().forEach(t => t.stop()))
                 .catch(() => {});
             }
           } catch (e) {}
           try { await NotifyBridge.login({ externalId }); } catch (e) {}
        } else {
          await NotifyBridge.logout();
        }
      } else {
        if (externalId) {
          window.OneSignal = window.OneSignal || [];
          window.OneSignal.push(function() {
            window.OneSignal.init({ appId: ONESIGNAL_APP_ID, allowLocalhostAsSecureOrigin: true });
            window.OneSignal.login(externalId);
          });
        } else {
          if (window.OneSignal) {
            window.OneSignal.push(function() { window.OneSignal.logout(); });
          }
        }
      }
    };
    syncOneSignal();
  }, [user]);
  return null;
}