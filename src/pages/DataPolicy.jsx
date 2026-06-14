import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function DataPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-6">Data Policy</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        <h2 className="text-lg font-semibold text-foreground">Data Storage</h2>
        <p>Your data is stored securely using encrypted databases. We use industry-standard security practices to protect your information.</p>
        <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
        <p>Your data is retained for as long as your account is active. You may request data deletion at any time through the <Link to="/delete-data" className="text-primary underline">Delete My Data</Link> page.</p>
        <h2 className="text-lg font-semibold text-foreground">AI Processing</h2>
        <p>Your health profile and disability information is processed by OpenAI's API to generate personalized exercise recommendations. This data is sent securely and is not stored by OpenAI for training purposes.</p>
        <h2 className="text-lg font-semibold text-foreground">Security</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>All data transmitted over encrypted connections (HTTPS)</li>
          <li>Authentication required for all data access</li>
          <li>Regular security monitoring</li>
          <li>No data sharing with third parties for advertising</li>
        </ul>
      </div>
    </div>
  );
}