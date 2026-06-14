import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, Shield, FileText, Trash2, LogOut, Loader2,
  ChevronRight, Heart, Eye, Volume2, Brain
} from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();
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
          <h2 className="font-heading font-semibold">Profile</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Name</Label>
            <Input
              value={profile?.display_name || ""}
              onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
              onBlur={() => updateProfile({ display_name: profile?.display_name })}
              className="mt-1"
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
        <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")} className="mt-2">
          Redo Onboarding
        </Button>
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
          { path: "/data-policy", label: "Data Policy" },
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

      {/* Logout */}
      <Button variant="outline" onClick={handleLogout} className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
        <LogOut className="w-4 h-4" /> Log Out
      </Button>
    </div>
  );
}