import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function DataPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-2">Data & Intellectual Property Policy</h1>
      <p className="text-sm text-muted-foreground mb-8"><strong>Effective Date:</strong> June 23, 2025 &nbsp;|&nbsp; <strong>Last Updated:</strong> June 23, 2025</p>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Data Storage & Infrastructure</h2>
          <p>All user data is stored in encrypted databases hosted by Base44, our backend platform. Data at rest is encrypted using AES-256. Data in transit is protected by TLS 1.2 or higher. Database access is restricted to authenticated service accounts with least-privilege permissions.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Data Retention & Deletion</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your data is retained for as long as your account remains active.</li>
            <li>Upon account deletion, all personal data (profile, health information, workout history, logs) is permanently deleted within 30 days.</li>
            <li>Anonymised, aggregate statistical data (not linked to you) may be retained for analytical purposes.</li>
            <li>Backups containing your data are purged within 90 days of account deletion.</li>
          </ul>
          <p className="mt-2">You can initiate deletion at any time: <Link to="/delete-data" className="text-primary underline">Delete My Data</Link> | <Link to="/delete-account" className="text-primary underline">Delete My Account</Link>.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Special Category Health Data</h2>
          <p>We recognise that disability, medical condition, and pain data is sensitive ("special category" data under GDPR). This data is:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Collected only with your explicit consent.</li>
            <li>Used solely to generate safe exercise recommendations for you.</li>
            <li>Never shared with third parties for any purpose other than AI-powered recommendation generation.</li>
            <li>Deletable at any time by you.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">AI Processing & OpenAI</h2>
          <p>To generate your personalised workout plan, your health profile is sent to OpenAI's API. Specifically:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Data sent includes: your fitness mode, disabilities/conditions (as free text), pain areas, activity level, goals, and physical limitations.</li>
            <li>OpenAI's API does <strong>not</strong> use data submitted via the API for training their models (per OpenAI's data processing terms).</li>
            <li>Data is sent over encrypted connections and is not stored by OpenAI beyond the scope of processing your request.</li>
            <li>We have data processing agreements in place with OpenAI.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Intellectual Property</h2>
          <p>All intellectual property within FitAbility — including but not limited to the application code, user interface designs, graphics, branding, workout generation algorithms, AI prompt engineering, and AI-generated content — is owned exclusively by FitAbility and its creators.</p>
          <p className="mt-2">You may not:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Copy, reproduce, distribute, or publicly display any part of the App without written permission.</li>
            <li>Reverse-engineer, decompile, or disassemble the App.</li>
            <li>Use any AI-generated workout content commercially outside the App.</li>
            <li>Create derivative works based on FitAbility's proprietary methods or branding.</li>
            <li>Scrape, crawl, or systematically extract data from the App.</li>
          </ul>
          <p className="mt-2">Your personal data remains yours. You grant FitAbility a limited, non-exclusive, revocable licence to process your data solely for the purpose of providing the service described in these policies.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Data Sharing</h2>
          <p>We do not sell, rent, or share your personal data with third parties for advertising, marketing, or commercial purposes. The only data sharing that occurs is:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>With OpenAI for workout generation (see above).</li>
            <li>With Base44 for hosting and authentication infrastructure.</li>
            <li>When required by applicable law or legal process.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Cookies & Tracking</h2>
          <p>FitAbility uses only essential cookies/storage required for authentication and user preferences (such as dark mode). We do not use advertising trackers, third-party analytics pixels, or cross-site tracking technologies.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Contact</h2>
          <p>For data-related enquiries, requests, or complaints, contact: <a href="mailto:mediocreatbestdev@outlook.com" className="text-primary underline">mediocreatbestdev@outlook.com</a></p>
        </section>

      </div>
    </div>
  );
}