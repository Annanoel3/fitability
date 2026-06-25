import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const AccessibilityContext = createContext({ prefs: {}, updatePrefs: () => {} });

export function AccessibilityProvider({ children }) {
  const [prefs, setPrefs] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({});
        if (profiles.length > 0) {
          setPrefs(profiles[0].accessibility_preferences || {});
        }
      } catch (e) {
        // not logged in yet
      }
    };
    load();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("large-text", !!prefs.large_text);
    root.classList.toggle("high-contrast", !!prefs.high_contrast);
    root.classList.toggle("simplified", !!prefs.simplified);
  }, [prefs]);

  const updatePrefs = (newPrefs) => setPrefs(newPrefs);

  return (
    <AccessibilityContext.Provider value={{ prefs, updatePrefs }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);