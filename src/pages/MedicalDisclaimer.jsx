import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, AlertTriangle } from "lucide-react";

export default function MedicalDisclaimer() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 pb-20 md:pb-8">
      <Link to="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Settings
      </Link>
      <h1 className="text-3xl font-heading font-bold mb-6">Medical Disclaimer</h1>
      
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
        <div>
          <h2 className="text-lg font-bold text-amber-900">Important Safety Notice</h2>
          <p className="text-amber-800 mt-2">FitAbility is <strong>NOT</strong> a medical device, medical service, physical therapy service, or replacement for professional healthcare.</p>
        </div>
      </div>

      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <h2 className="text-lg font-semibold text-foreground">What FitAbility Is</h2>
        <p>FitAbility is an AI-powered fitness recommendation tool designed to suggest adaptive exercises for individuals with varying physical abilities. It uses artificial intelligence to generate exercise suggestions based on user-provided information.</p>
        
        <h2 className="text-lg font-semibold text-foreground">What FitAbility Is NOT</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Not medical advice</li>
          <li>Not physical therapy</li>
          <li>Not a replacement for physician guidance</li>
          <li>Not a diagnostic tool</li>
          <li>Not an emergency medical service</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Consult Your Healthcare Provider</h2>
        <p>Before starting any exercise program, especially if you have a disability, chronic condition, or recent injury, you <strong>must</strong> consult with your healthcare provider, physical therapist, or physician. They can provide personalized medical guidance that this application cannot.</p>

        <h2 className="text-lg font-semibold text-foreground">When to Stop</h2>
        <p>Stop exercising immediately and seek medical attention if you experience: chest pain, severe dizziness, difficulty breathing, loss of consciousness, sudden severe pain, numbness or weakness, or any other concerning symptoms.</p>

        <h2 className="text-lg font-semibold text-foreground">AI Limitations</h2>
        <p>While we use advanced AI with multiple safety validations, no AI system is perfect. Exercise recommendations may not account for every possible medical condition or interaction. Always use your own judgment and consult professionals when in doubt.</p>
      </div>
    </div>
  );
}