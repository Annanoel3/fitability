import React from "react";
import { AlertTriangle, Phone } from "lucide-react";

export default function EmergencyBanner({ onDismiss }) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-heading font-bold text-lg text-red-900">Stop & Seek Help</h3>
          <p className="text-sm text-red-700 mt-1">
            You reported severe pain. Please do not exercise. If you're experiencing chest pain, 
            difficulty breathing, sudden weakness, or severe dizziness, call emergency services immediately.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href="tel:911"
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold text-sm"
        >
          <Phone className="w-4 h-4" /> Call 911
        </a>
        <button
          onClick={onDismiss}
          className="px-6 py-3 rounded-xl border border-red-300 text-red-700 font-medium text-sm"
        >
          I'm okay, continue
        </button>
      </div>

      <p className="text-xs text-red-600">
        FitAbility is not a medical service. Always consult your healthcare provider about pain.
      </p>
    </div>
  );
}