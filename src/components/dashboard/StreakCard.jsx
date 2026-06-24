import React from "react";
import { Flame, Star, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function StreakCard({ workouts }) {
  const today = new Date();
  let streak = 0;
  const sortedDates = workouts
    .filter(w => w.completed)
    .map(w => w.date)
    .sort((a, b) => new Date(b) - new Date(a));

  const unique = [...new Set(sortedDates)];
  for (let i = 0; i < unique.length; i++) {
    const d = new Date(unique[i]);
    const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
    if (diff <= i + 1) {
      streak++;
    } else {
      break;
    }
  }

  const thisWeek = workouts.filter(w => {
    const d = new Date(w.date);
    const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
    return diff < 7 && w.completed;
  }).length;

  return (
    <Link to="/progress" className="block bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-lg text-foreground">Your Progress</h3>
        <div className="flex items-center gap-1">
          <Flame className="w-6 h-6 text-accent" />
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-primary">{streak}</div>
          <div className="text-xs text-muted-foreground mt-1">Day Streak</div>
        </div>
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-accent">{thisWeek}</div>
          <div className="text-xs text-muted-foreground mt-1">This Week</div>
        </div>
      </div>

      {thisWeek > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="w-4 h-4 text-accent" />
          <span>You completed movement {thisWeek} day{thisWeek !== 1 ? "s" : ""} this week. Keep going!</span>
        </div>
      )}
    </Link>
  );
}