import React from "react";
import { Volume2, Headphones, X } from "lucide-react";

export default function WorkoutAudioModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Volume2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">Audio Coaching</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Would you like audio guidance for this workout? If you're in a noisy place or can't talk (e.g., at the gym), you can use voice-off mode instead.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              onConfirm("off");
              onClose();
            }}
            className="flex-1 border border-border rounded-xl py-2.5 font-medium text-sm hover:bg-muted transition-colors">
            Voice Off
          </button>
          <button
            onClick={() => {
              onConfirm("on");
              onClose();
            }}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <Headphones className="w-4 h-4" /> With Audio
          </button>
        </div>
      </div>
    </div>
  );
}