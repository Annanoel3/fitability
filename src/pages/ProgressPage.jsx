import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingUp, Dumbbell, Calendar, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ProgressLogForm from "@/components/progress/ProgressLogForm";

export default function ProgressPage() {
  const [painLogs, setPainLogs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [progressLogs, setProgressLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logData, setLogData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
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

  const handleLogSave = async () => {
    await loadData();
    setShowLogForm(false);
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
        <Button onClick={() => setShowLogForm(!showLogForm)} variant="outline" size="sm" data-tour-log-btn>
          Log Progress
        </Button>
      </div>

      {showLogForm && (
        <ProgressLogForm
          onSave={handleLogSave}
          onCancel={() => setShowLogForm(false)}
          saving={saving}
        />
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