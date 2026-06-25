import React from "react";
import { BookOpen, TrendingUp, Home } from "lucide-react";

const tourContent = {
  library: {
    icon: BookOpen,
    title: "Explore the Exercise Library",
    message: "You can browse hundreds of exercises tailored to your needs. Try clicking one of the sorting buttons to see how you can organize exercises by different categories.",
    buttonText: "Got it"
  },
  progress: {
    icon: TrendingUp,
    title: "Track Your Progress",
    message: "This is where you log your daily progress. Click 'Log Progress' to record your mood, pain levels, symptoms, and any other metrics to help me understand how you're doing.",
    buttonText: "Understood"
  },
  home_end: {
    icon: Home,
    title: "Welcome Home!",
    message: "Great work completing the tour! Your FitAbility dashboard is here. Start with today's workout, track your progress in the Progress tab, and anytime you have questions about your workouts or health—just visit the Coach. You've got this! 💪",
    buttonText: "Let's Go!"
  }
};

export default function TourPopup({ tourStep, onClose }) {
  if (!tourStep || !tourContent[tourStep]) return null;

  const content = tourContent[tourStep];
  const Icon = content.icon;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center px-5">
      <div className="bg-card rounded-3xl border border-border w-full max-w-xs p-8 shadow-2xl text-center space-y-5 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-foreground">{content.title}</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {content.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-medium text-sm hover:bg-primary/90 transition-colors">
          {content.buttonText}
        </button>
      </div>
    </div>
  );
}