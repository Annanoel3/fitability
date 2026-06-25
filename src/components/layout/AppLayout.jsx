import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTheme } from "@/lib/ThemeContext";
import {
  Heart, Home, Dumbbell, BookOpen, TrendingUp,
  Settings, Menu, X, LogOut, Bot, Sun, Moon } from
"lucide-react";

const NAV_ITEMS = [
{ path: "/", label: "Home", icon: Home },
{ path: "/coach", label: "Coach", icon: Bot },
{ path: "/exercises", label: "Library", icon: BookOpen },
{ path: "/progress", label: "Progress", icon: TrendingUp },
{ path: "/settings", label: "Settings", icon: Settings }];


export default function AppLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { dark, toggle } = useTheme();

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="w-7 h-7 text-primary" />
            <span className="font-heading font-bold text-xl text-foreground">FitAbility</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ?
                  "bg-primary text-primary-foreground" :
                  "text-muted-foreground hover:text-foreground hover:bg-muted"}`
                  }>
                  
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>);

            })}
            <button
              onClick={toggle}
              className="ml-1 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}>
              
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="ml-1 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
              
              <LogOut className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen &&
        <div className="md:hidden border-t border-border bg-card px-4 py-3">
            {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`
                }>
                
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>);

          })}
            <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground w-full">
            
              <LogOut className="w-5 h-5" /> Log Out
            </button>
          </div>
        }
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 md:pb-6 py-2">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex items-center justify-between px-1 py-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-tour-nav={item.label}
                className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-lg text-xs ${
                active ? "text-primary" : "text-muted-foreground"}`
                }>
                
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] leading-tight">{item.label}</span>
              </Link>);

          })}
        </div>
      </nav>
    </div>);

}