import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Workout from '@/pages/Workout';
import ExerciseLibrary from '@/pages/ExerciseLibrary';
import ProgressPage from '@/pages/ProgressPage';
import SettingsPage from '@/pages/SettingsPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsConditions from '@/pages/TermsConditions';
import MedicalDisclaimer from '@/pages/MedicalDisclaimer';
import DataPolicy from '@/pages/DataPolicy';
import DeleteData from '@/pages/DeleteData';
import DeleteAccount from '@/pages/DeleteAccount';
import CoachChat from '@/pages/CoachChat';
import FeedbackPage from '@/pages/FeedbackPage';
import AppLayout from '@/components/layout/AppLayout';
import { initAdMob, maybeShowAdOnOpen } from '@/lib/admob';
import OneSignalInit from '@/components/shared/OneSignalInit';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  useEffect(() => { initAdMob().then(() => maybeShowAdOnOpen()); }, []);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
      <OneSignalInit user={user} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/coach" element={<CoachChat />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/medical-disclaimer" element={<MedicalDisclaimer />} />
            <Route path="/data-policy" element={<DataPolicy />} />
            <Route path="/delete-data" element={<DeleteData />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/feedback" element={<FeedbackPage />} />
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App