import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Loader2, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
"Today's workout feels too hard for me",
"My shoulder is hurting, can we adjust?",
"Make today's workout easier please",
"What exercises can I do for bad knees?"];


function MessageBubble({ message, isTourCoachMessage }) {
  const isUser = message.role === "user";
  let content = message.content;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser &&
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      }
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
        isUser ?
        "bg-primary text-primary-foreground rounded-tr-sm" :
        "bg-card border border-border rounded-tl-sm"}`
        }>
        
        {isUser ?
        <p>{message.content}</p> :

        <ReactMarkdown className="prose prose-sm max-w-none [&>p]:mb-2 [&>ul]:pl-4 [&>ul]:list-disc [&>ol]:pl-4 [&>ol]:list-decimal">
            {content}
          </ReactMarkdown>
        }
        {message.planUpdated &&
        <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Workout plan updated
          </div>
        }
      </div>
    </div>);

}

export default function CoachChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const messagesEndRef = useRef(null);
  const hasWelcomed = useRef(false);
  const isTourCoachMessage = tourStep === "coach_message";

  useEffect(() => {
    const parent = messagesEndRef.current?.parentElement;
    if (parent) {
      parent.scrollTop = parent.scrollHeight;
    }
  }, [messages, sending]);

  useEffect(() => {
    // Listen for tour step changes
    const handleTourChange = (e) => {
      setTourStep(e.detail.tourStep);
    };
    window.addEventListener("fitability-tour-step-change", handleTourChange);
    // Set initial tour step if already active
    if (window.fitabilityTourStep) {
      setTourStep(window.fitabilityTourStep);
    }
    return () => window.removeEventListener("fitability-tour-step-change", handleTourChange);
  }, []);

  useEffect(() => {
    const init = async () => {
      const profiles = await base44.entities.UserProfile.filter({});
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        // Auto-send welcome message on very first coach visit (no prior messages)
        if (!hasWelcomed.current && messages.length === 0) {
          hasWelcomed.current = true;
          await sendWelcome(profiles[0]);
        }
      }
    };
    init();
  }, []);

  // Pre-fill message during coach message tour step
  useEffect(() => {
    if (isTourCoachMessage) {
      setInput("Sounds good!");
    }
  }, [isTourCoachMessage]);

  const sendWelcome = async (prof) => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("coachChat", {
        messages: [],
        isWelcome: true,
        profileName: prof.display_name
      });
      const { reply } = res.data;
      // Remove any "What can I help..." text from the reply
      const cleanReply = reply.replace(/\s*What can I help you with today\?.*$/i, "").trim();
      setMessages([{ role: "assistant", content: cleanReply }]);
      // If in coach tour step, advance to coach_message step
      if (window.fitabilityTourStep === "coach") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: "coach_message" } }));
        }, 300);
      }
    } catch (e) {
      setMessages([{ role: "assistant", content: `Hi ${prof?.display_name || "there"}! I'm your FitAbility Coach. I'm here to help adjust your workouts, answer questions, and keep you moving safely.` }]);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || sending) return;
    setInput("");

    const userMsg = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setSending(true);

    try {
      const res = await base44.functions.invoke("coachChat", {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content }))
      });
      const { reply, planUpdated, updatedMemory } = res.data;
      // Persist updated coach memory back to user profile
      if (updatedMemory && profile?.id) {
        await base44.entities.UserProfile.update(profile.id, { coach_memory: updatedMemory });
        setProfile((prev) => ({ ...prev, coach_memory: updatedMemory }));
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply, planUpdated }]);

      // Auto-advance tour when user sends "Sounds good!" during coach message step
      if (isTourCoachMessage && userText.toLowerCase().includes("sounds good")) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: "library" } }));
        }, 500);
      }
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble right now. Please try again in a moment."
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card rounded-t-2xl">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="font-heading font-semibold text-sm">FitAbility Coach</div>
          <div className="text-xs text-muted-foreground">Powered by GPT-4o · Your adaptive fitness assistant</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
        {messages.length === 0 &&
        <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">Hi, I'm your FitAbility Coach!</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Tell me how your workouts are going — I can adjust your plan, suggest modifications, or answer any fitness questions.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
              {SUGGESTIONS.map((s) =>
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-left text-sm px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary transition-all">
              
                  {s}
                </button>
            )}
            </div>
          </div>
        }

        {messages.map((msg, i) =>
        <MessageBubble key={i} message={msg} isTourCoachMessage={isTourCoachMessage} />
        )}


        <div ref={messagesEndRef} />
      </div>

      {isTourCoachMessage &&
      <style>{`
          @keyframes button-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(174, 104, 75, 0.7); }
            50% { transform: scale(1.3); box-shadow: 0 0 0 10px rgba(174, 104, 75, 0); }
          }
          [data-tour-coach-send] {
            animation: button-pulse 1.5s ease-in-out infinite !important;
            pointer-events: auto !important;
          }
          [data-tour-coach-input] {
            color: hsl(var(--foreground)) !important;
          }
          [data-tour-coach-input]::placeholder {
            color: hsl(var(--foreground)) !important;
          }
        `}</style>
      }

      {/* Input */}
      <div className={`px-4 border-t border-border bg-card rounded-b-2xl flex-shrink-0 ${isTourCoachMessage ? "pointer-events-none" : ""}`}>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me how your workout is going…"
            className={`flex-1 rounded-xl ${isTourCoachMessage ? "text-foreground" : ""}`}
            disabled={sending || isTourCoachMessage}
            data-tour-coach-input />
          
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending || !isTourCoachMessage ? false : false}
            size="icon"
            className="rounded-xl"
            style={isTourCoachMessage ? { pointerEvents: "auto" } : {}}
            data-tour-coach-send={isTourCoachMessage ? "true" : undefined}>
            
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>);

}