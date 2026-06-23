import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8"><strong>Effective Date:</strong> June 23, 2025 &nbsp;|&nbsp; <strong>Last Updated:</strong> June 23, 2025</p>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Who We Are</h2>
          <p>FitAbility ("we", "our", or "us") is an AI-powered adaptive fitness application designed for individuals with disabilities, chronic pain, injuries, and mobility limitations. We are committed to protecting your personal data and being transparent about how we use it.</p>
          <p className="mt-2">Contact: <a href="mailto:mediocreatbestdev@outlook.com" className="text-primary underline">mediocreatbestdev@outlook.com</a></p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. What Data We Collect</h2>
          <p>We collect the following categories of personal data when you use FitAbility:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Account Data:</strong> Email address, name, and authentication credentials.</li>
            <li><strong>Health & Biometric Data:</strong> Age, sex, height, weight, disability diagnoses, chronic conditions, pain levels, body limitations, physical abilities, and injury history.</li>
            <li><strong>Fitness & Activity Data:</strong> Workout history, exercise completions, progress logs, daily check-ins, and goal preferences.</li>
            <li><strong>Usage Data:</strong> App interactions, feature usage, and device/browser information.</li>
            <li><strong>Communications:</strong> Feedback you send to us via the in-app feedback form.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Legal Basis for Processing (GDPR / UK GDPR)</h2>
          <p>Where applicable law requires a legal basis for processing, we rely on:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Performance of a contract</strong> — to provide personalised exercise recommendations.</li>
            <li><strong>Explicit consent</strong> — for processing special-category health data. You may withdraw consent at any time by deleting your account.</li>
            <li><strong>Legitimate interests</strong> — for security monitoring, fraud prevention, and service improvement.</li>
            <li><strong>Legal obligation</strong> — where required by applicable law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generate personalised, safe workout plans based on your health profile.</li>
            <li>Filter out exercises that may be unsafe given your specific conditions.</li>
            <li>Track your progress and adapt recommendations over time.</li>
            <li>Operate, maintain, and improve the application.</li>
            <li>Respond to your feedback and support requests.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Third-Party Services</h2>
          <p>We use the following third-party services that may receive or process your data:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>OpenAI (GPT API):</strong> Your anonymised health profile is sent to generate workout recommendations. We have Data Processing Agreements in place. OpenAI does not use API data for training by default.</li>
            <li><strong>Base44 (Backend Platform):</strong> Hosts our database and authentication infrastructure with industry-standard encryption.</li>
          </ul>
          <p className="mt-2">We <strong>never sell</strong> your personal data to third parties for advertising or commercial purposes.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Data Retention</h2>
          <p>We retain your data for as long as your account is active. When you delete your account or request data deletion, your personal data is permanently removed within 30 days, except where retention is required by law.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Access:</strong> Request a copy of the data we hold about you.</li>
            <li><strong>Rectification:</strong> Correct inaccurate or incomplete data.</li>
            <li><strong>Erasure ("Right to be Forgotten"):</strong> Request deletion of your personal data.</li>
            <li><strong>Restriction:</strong> Request that we limit how we process your data.</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
            <li><strong>Withdraw Consent:</strong> At any time where processing is based on consent.</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, email us at <a href="mailto:mediocreatbestdev@outlook.com" className="text-primary underline">mediocreatbestdev@outlook.com</a> or use the <Link to="/delete-data" className="text-primary underline">Delete My Data</Link> or <Link to="/delete-account" className="text-primary underline">Delete My Account</Link> pages.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">8. Security</h2>
          <p>We implement industry-standard technical and organisational measures including: TLS encryption in transit, encrypted storage at rest, access controls, and regular security reviews. However, no system is 100% secure and we cannot guarantee absolute security.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">9. Children</h2>
          <p>FitAbility is not directed to children under 13 (or 16 in the EU). We do not knowingly collect personal data from children. If you believe a child has provided us data, please contact us immediately.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">10. Changes to This Policy</h2>
          <p>We may update this policy periodically. We will notify you of material changes via the app or email. Continued use after changes constitutes acceptance.</p>
        </section>

      </div>
    </div>
  );
}