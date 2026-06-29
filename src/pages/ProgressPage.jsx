import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Dumbbell, Calendar, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

const MOOD_EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];

export default function ProgressPage() {
  const [painLogs, setPainLogs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [progressLogs, setProgressLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logData, setLogData] = useState({});
  const [saving, setSaving] = useState(false);
  const [tourStep, setTourStep] = useState(null);
  const isTourProgressLog = tourStep === "progress_log";

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleTourChange = (e) => {
      setTourStep(e.detail.tourStep);
      if (e.detail.tourStep === "progress_log") {
        setShowLogForm(false); // Reset form so user clicks the button themselves
      }
    };
    window.addEventListener("fitability-tour-step-change", handleTourChange);
    if (window.fitabilityTourStep) setTourStep(window.fitabilityTourStep);
    return () => window.removeEventListener("fitability-tour-step-change", handleTourChange);
  }, []);

  const loadData = async () => {
    const [pain, work, prog] = await Promise.all([
      base44.entities.PainLog.filter({}, "-date", 30),
      base44.entities.WorkoutPlan.filter({}, "-date", 30),
      base44.entities.ProgressLog.filter({}, "-date", 30)
    ]);
    setPainLogs(pain);
    setWorkouts(work);
    setProgressLogs(prog);
    setLoading(false);
  };

  const saveProgress = async () => {
    setSaving(true);
    await base44.entities.ProgressLog.create({
      date: new Date().toISOString().split("T")[0],
      ...logData
    });
    await loadData();
    setShowLogForm(false);
    setLogData({});
    setSaving(false);

    // Advance tour after saving
    if (tourStep === "progress_log") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "progress_logged" }));
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedWorkouts = workouts.filter(w => w.completed);
  const totalMinutes = completedWorkouts.reduce((sum, w) => sum + (w.total_duration_minutes || 0), 0);

  const painChartData = [...painLogs]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-14)
    .map(l => ({
      date: new Date(l.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
      pain: l.overall_pain || 0,
      fatigue: l.fatigue_level || 0
    }));

  const workoutChartData = [];
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayWorkouts = workouts.filter(w => w.date === dateStr && w.completed);
    last7.push({
      date: d.toLocaleDateString("en", { weekday: "short" }),
      count: dayWorkouts.length,
      minutes: dayWorkouts.reduce((s, w) => s + (w.total_duration_minutes || 0), 0)
    });
  }

  return (
    <div className="pb-20 md:pb-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Progress</h1>
          <p className="text-muted-foreground mt-1">Track your journey over time.</p>
        </div>
        {isTourProgressLog && (
          <style>{`
            @keyframes log-btn-pulse {
              0%   { transform: scale(1);    box-shadow: 0 0 0 0   hsl(var(--primary) / 0.7), 0 0 20px hsl(var(--primary) / 0.4); }
              50%  { transform: scale(1.18); box-shadow: 0 0 0 16px hsl(var(--primary) / 0),  0 0 40px hsl(var(--primary) / 0.2); }
              100% { transform: scale(1);    box-shadow: 0 0 0 0   hsl(var(--primary) / 0.7), 0 0 20px hsl(var(--primary) / 0.4); }
            }
            [data-tour-log-button="true"] {
              animation: log-btn-pulse 1.1s ease-in-out infinite !important;
            }
          `}</style>
        )}
        <Button
          onClick={() => setShowLogForm(!showLogForm)}
          variant={isTourProgressLog ? "default" : "outline"}
          size={isTourProgressLog ? "lg" : "sm"}
          data-tour-log-button={isTourProgressLog ? "true" : undefined}
          style={isTourProgressLog ? { fontSize: "1rem", fontWeight: 700, letterSpacing: "0.01em" } : undefined}
        >
          Log Progress
        </Button>
      </div>

      {showLogForm && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <h3 className="font-heading font-semibold">Log Today's Progress</h3>

          <div>
            <Label className="text-sm">Activity Completed Today?</Label>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setLogData(p => ({ ...p, activity_pct: 100 }))}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${logData.activity_pct === 100 ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                ✅ Yes
              </button>
              <button
                onClick={() => setLogData(p => ({ ...p, activity_pct: 0 }))}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${logData.activity_pct === 0 ? "bg-destructive text-destructive-foreground border-destructive" : "border-border text-muted-foreground hover:border-destructive/50"}`}
              >
                ❌ No
              </button>
            </div>
          </div>

          <div>
            <Label className="text-sm">Energy Level ({logData.energy_level ?? 5}/10)</Label>
            <Slider
              min={1} max={10} step={1}
              value={[logData.energy_level ?? 5]}
              onValueChange={([v]) => setLogData(p => ({ ...p, energy_level: v }))}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm">Pain Level ({logData.overall_pain ?? 0}/10)</Label>
            <Slider
              min={0} max={10} step={1}
              value={[logData.overall_pain ?? 0]}
              onValueChange={([v]) => setLogData(p => ({ ...p, overall_pain: v }))}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-sm">Mood</Label>
            <div className="flex gap-3 mt-2">
              {MOOD_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setLogData(p => ({ ...p, mood_score: i + 1 }))}
                  className={`text-2xl p-1.5 rounded-lg transition-all ${logData.mood_score === i + 1 ? "bg-primary/20 scale-125" : "opacity-50 hover:opacity-80"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea
              value={logData.notes || ""}
              onChange={e => setLogData(p => ({ ...p, notes: e.target.value }))}
              placeholder="How are you feeling today?"
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          {isTourProgressLog && (
            <style>{`
              @keyframes save-btn-pulse {
                0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.7), 0 0 16px hsl(var(--primary) / 0.4); }
                50%      { box-shadow: 0 0 0 10px hsl(var(--primary) / 0), 0 0 32px hsl(var(--primary) / 0.2); }
              }
              [data-tour-save-btn="true"] {
                outline: 3px solid hsl(var(--primary)) !important;
                outline-offset: 3px !important;
                animation: save-btn-pulse 1.1s ease-in-out infinite !important;
              }
            `}</style>
          )}
          <div className="flex gap-2">
            <Button
              onClick={saveProgress}
              disabled={saving}
              data-tour-save-btn={isTourProgressLog ? "true" : undefined}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setShowLogForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Dumbbell className="w-6 h-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{completedWorkouts.length}</div>
          <div className="text-xs text-muted-foreground">Workouts</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Activity className="w-6 h-6 text-accent mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{totalMinutes}</div>
          <div className="text-xs text-muted-foreground">Total Minutes</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{painLogs.length}</div>
          <div className="text-xs text-muted-foreground">Days Tracked</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{progressLogs.length}</div>
          <div className="text-xs text-muted-foreground">Progress Logs</div>
        </div>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="pain">Pain & Fatigue</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold mb-4">Last 7 Days</h3>
            {last7.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Minutes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">Complete workouts to see your activity chart.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pain" className="mt-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-semibold mb-4">Pain & Fatigue Trends</h3>
            {painChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={painChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pain" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Pain" />
                  <Line type="monotone" dataKey="fatigue" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Fatigue" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">Log daily check-ins to track your pain trends.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}