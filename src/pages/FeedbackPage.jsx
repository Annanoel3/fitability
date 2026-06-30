import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Send, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Accessibility Issue",
  "Exercise / Workout Feedback",
  "General Feedback",
  "Other",
];

export default function FeedbackPage() {
  const [form, setForm] = useState({ category: "General Feedback", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { setError("Please enter a message."); return; }
    setSending(true);
    setError("");
    try {
      await base44.functions.invoke('notifyDeveloper', {
        message: `Category: ${form.category}\nSubject: ${form.subject || "(none)"}\n\n${form.message}`,
        category: "feedback",
      });
      setSent(true);
    } catch (err) {
      setError("Failed to send feedback. Please try again.");
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 pb-20 md:pb-8">
        <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Settings
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <CheckCircle className="w-16 h-16 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Feedback Sent!</h1>
          <p className="text-muted-foreground max-w-sm">Thank you for your feedback. We read every message and use it to improve FitAbility.</p>
          <Button variant="outline" onClick={() => { setForm({ category: "General Feedback", subject: "", message: "" }); setSent(false); }}>
            Send Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-2">Send Feedback</h1>
      <p className="text-muted-foreground mb-8">We read every message. Your feedback helps make FitAbility better for everyone.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="text-sm mb-1.5 block">Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  form.category === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="subject" className="text-sm mb-1.5 block">Subject <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            id="subject"
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Brief summary..."
            maxLength={120}
          />
        </div>

        <div>
          <Label htmlFor="message" className="text-sm mb-1.5 block">Message <span className="text-destructive">*</span></Label>
          <Textarea
            id="message"
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Describe your feedback in detail..."
            rows={6}
            className="resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={sending} className="w-full gap-2 h-12">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending..." : "Send Feedback"}
        </Button>
      </form>
    </div>
  );
}