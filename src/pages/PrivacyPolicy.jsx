import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        <h2 className="text-lg font-semibold text-foreground">What Data We Collect</h2>
        <p>FitAbility collects the following information to provide personalized, safe exercise recommendations:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Name, age, sex, height, and weight</li>
          <li>Disability and medical condition information</li>
          <li>Pain levels and symptom data</li>
          <li>Body limitations and current physical abilities</li>
          <li>Workout history and progress data</li>
          <li>Daily check-in responses</li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">Why We Collect It</h2>
        <p>All data is collected solely to generate safe, personalized exercise recommendations. Your disability and health information is used as safety constraints to prevent unsafe exercises from appearing in your workouts.</p>
        <h2 className="text-lg font-semibold text-foreground">Third-Party Services</h2>
        <p>We use AI services (OpenAI) to generate personalized workout plans. Your health profile data is sent to these services for processing. No data is sold to third parties.</p>
        <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data at any time. See our <Link to="/delete-data" className="text-primary underline">Data Deletion</Link> page or <Link to="/delete-account" className="text-primary underline">Account Deletion</Link> page.</p>
      </div>
    </div>
  );
}