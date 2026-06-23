import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, FileText, LogOut, Loader2,
  ChevronRight, Eye, Save, MessageSquare, Sun, Moon
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import EquipmentEditor from "@/components/settings/EquipmentEditor";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const profiles = await base44.entities.UserProfile.filter({});
    if (profiles.length > 0) setProfile(profiles[0]);
    setLoading(false);
  };

  const updateProfile = async (updates) => {
    if (!profile) return;
    setSaving(true);
    await base44.entities.UserProfile.update(profile.id, updates);
    setProfile(prev => ({ ...prev, ...updates }));
    setSaving(false);
  };

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const prefs = profile?.accessibility_preferences || {};

  return (
    <div className="pb-20 md:pb-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>

      {/* Profile */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold">My Profile</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-sm">Display Name</Label>
            <Input
              value={profile?.display_name || ""}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              onBlur={() => updateProfile({ display_name: profile?.display_name })}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm">Date of Birth</Label>
            <Input
              type="date"
              value={profile?.date_of_birth || ""}
              onChange={e => setProfile(p => ({ ...p, date_of_birth: e.target.value }))}
              onBlur={() => updateProfile({ date_of_birth: profile?.date_of_birth })}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm">Sex</Label>
            <Select
              value={profile?.sex || ""}
              onValueChange={v => updateProfile({ sex: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Height (ft)</Label>
            <Input
              type="number"
              min={1} max={8}
              value={profile?.height_inches ? Math.floor(profile.height_inches / 12) : ""}
              onChange={e => {
                const ft = parseInt(e.target.value) || 0;
                const inches = profile?.height_inches ? profile.height_inches % 12 : 0;
                setProfile(p => ({ ...p, height_inches: ft * 12 + inches }));
              }}
              onBlur={() => updateProfile({ height_inches: profile?.height_inches })}
              className="mt-1"
              placeholder="5"
            />
          </div>

          <div>
            <Label className="text-sm">Height (in)</Label>
            <Input
              type="number"
              min={0} max={11}
              value={profile?.height_inches ? profile.height_inches % 12 : ""}
              onChange={e => {
                const inches = parseInt(e.target.value) || 0;
                const ft = profile?.height_inches ? Math.floor(profile.height_inches / 12) : 0;
                setProfile(p => ({ ...p, height_inches: ft * 12 + inches }));
              }}
              onBlur={() => updateProfile({ height_inches: profile?.height_inches })}
              className="mt-1"
              placeholder="8"
            />
          </div>

          <div>
            <Label className="text-sm">Current Weight (lbs)</Label>
            <Input
              type="number"
              value={profile?.weight_lbs || ""}
              onChange={e => setProfile(p => ({ ...p, weight_lbs: parseFloat(e.target.value) || undefined }))}
              onBlur={() => updateProfile({ weight_lbs: profile?.weight_lbs })}
              className="mt-1"
              placeholder="150"
            />
          </div>

          <div>
            <Label className="text-sm">Fitness Mode</Label>
            <Select
              value={profile?.fitness_mode || "Standard"}
              onValueChange={v => updateProfile({ fitness_mode: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Wheelchair">Wheelchair</SelectItem>
                <SelectItem value="Chair">Chair Only</SelectItem>
                <SelectItem value="Recovery">Recovery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {saving && <p className="text-xs text-muted-foreground flex items-center gap-1"><Save className="w-3 h-3" /> Saving...</p>}

        <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")}>
          Redo Full Onboarding
        </Button>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          {dark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
          <h2 className="font-heading font-semibold">Appearance</h2>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm">Dark Mode</div>
            <div className="text-xs text-muted-foreground">Switch to a dark colour scheme</div>
          </div>
          <Switch checked={dark} onCheckedChange={toggle} />
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold">Accessibility</h2>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm">Large Text</div>
            <div className="text-xs text-muted-foreground">Increase font sizes throughout the app</div>
          </div>
          <Switch
            checked={prefs.large_text || false}
            onCheckedChange={v => updateProfile({ accessibility_preferences: { ...prefs, large_text: v } })}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm">High Contrast</div>
            <div className="text-xs text-muted-foreground">Stronger colors for better visibility</div>
          </div>
          <Switch
            checked={prefs.high_contrast || false}
            onCheckedChange={v => updateProfile({ accessibility_preferences: { ...prefs, high_contrast: v } })}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-sm">Simplified Mode</div>
            <div className="text-xs text-muted-foreground">Fewer options, cleaner interface</div>
          </div>
          <Switch
            checked={prefs.simplified || false}
            onCheckedChange={v => updateProfile({ accessibility_preferences: { ...prefs, simplified: v } })}
          />
        </div>
      </div>

      {/* Equipment */}
      <EquipmentEditor profile={profile} onUpdate={setProfile} />

      {/* Legal */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold">Legal & Safety</h2>
        </div>
        {[
          { path: "/privacy", label: "Privacy Policy" },
          { path: "/terms", label: "Terms & Conditions" },
          { path: "/medical-disclaimer", label: "Medical Disclaimer" },
          { path: "/data-policy", label: "Data & IP Policy" },
          { path: "/delete-data", label: "Delete My Data" },
          { path: "/delete-account", label: "Delete My Account" }
        ].map(item => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Feedback */}
      <Link
        to="/feedback"
        className="flex items-center justify-between bg-card rounded-2xl border border-border px-5 py-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <div className="font-medium text-sm">Send Feedback</div>
            <div className="text-xs text-muted-foreground">Bug reports, feature requests, or anything else</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      {/* Logout */}
      <Button variant="outline" onClick={handleLogout} className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
        <LogOut className="w-4 h-4" /> Log Out
      </Button>
    </div>
  );
}