import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Send, Bot, Loader2, CheckCircle2, Mic, ArrowDownRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSpeechToText } from "@/hooks/useSpeechToText";

const SUGGESTIONS = [
"Today's workout feels too hard for me",
"My shoulder is hurting, can we adjust?",
"Make today's workout easier please",
"What exercises can I do for bad knees?"];


function MessageBubble({ message, isTourCoachMessage }) {
  const isUser = message.role === "user";
  let content = message.content;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} `}>
      {!isUser &&
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      }
      <div
        className={`max-w-[80%] px-4 text-sm ${
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

const CHAT_STORAGE_KEY = "fitability_chat_messages";
const CHAT_TIMESTAMP_KEY = "fitability_chat_timestamp";
const CHAT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

function loadPersistedMessages() {
  try {
    const ts = localStorage.getItem(CHAT_TIMESTAMP_KEY);
    if (!ts || Date.now() - Number(ts) > CHAT_TTL_MS) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.removeItem(CHAT_TIMESTAMP_KEY);
      return { messages: [], wasReset: !!ts }; // wasReset=true only if there WAS a previous session
    }
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    return { messages: stored ? JSON.parse(stored) : [], wasReset: false };
  } catch (e) {
    return { messages: [], wasReset: false };
  }
}

function persistMessages(msgs) {
  try {
    if (!localStorage.getItem(CHAT_TIMESTAMP_KEY)) {
      localStorage.setItem(CHAT_TIMESTAMP_KEY, String(Date.now()));
    }
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs));
  } catch (e) {}
}

export default function CoachChat() {
  const { messages: initialMessages, wasReset: initialWasReset } = loadPersistedMessages();
  const [messages, setMessages] = useState(initialMessages);
  const [wasReset] = useState(initialWasReset);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const [textareaHeight, setTextareaHeight] = useState(36);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const hasWelcomed = useRef(false);
  const tourStepRef = useRef(null);
  const isTourCoachMessage = tourStep === "coach_message";

  const mic = useSpeechToText({
    onResult: (t) => {
      setInput((prev) => {
        const base = prev.trim();
        const merged = base ? `${base} ${t}` : t;
        // keep textarea height in sync
        if (textareaRef.current) {
          textareaRef.current.value = merged;
          textareaRef.current.style.height = 'auto';
          const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
          textareaRef.current.style.height = newHeight + 'px';
          setTextareaHeight(newHeight);
        }
        return merged;
      });
    },
  });

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = newHeight + 'px';
      setTextareaHeight(newHeight);
    }
  };

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }, [messages]);

  useEffect(() => {
    // Listen for tour step changes — this is the reliable signal for the current tour step,
    // used instead of reading window.fitabilityTourStep directly (which is racy).
    const handleTourChange = (e) => {
      tourStepRef.current = e.detail.tourStep;
      setTourStep(e.detail.tourStep);
    };
    window.addEventListener("fitability-tour-step-change", handleTourChange);
    // Set initial tour step if already active
    if (window.fitabilityTourStep) {
      tourStepRef.current = window.fitabilityTourStep;
      setTourStep(window.fitabilityTourStep);
    }
    return () => window.removeEventListener("fitability-tour-step-change", handleTourChange);
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) persistMessages(messages);
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const profiles = await base44.entities.UserProfile.filter({});
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        // Non-tour welcome: show intro when chat is empty and NOT in the coach tour step.
        // The tour-step-watching effect below handles the coach tour welcome.
        const inCoachTour = tourStepRef.current === "coach" || tourStepRef.current === "coach_message";
        if (!hasWelcomed.current && !inCoachTour && messages.length === 0) {
          hasWelcomed.current = true;
          await sendWelcome(profiles[0]);
        }
      }
    };
    init();
  }, []);

  // Drives the onboarding coach welcome — must not depend on fragile global timing.
  // Fires when the tour reaches the "coach" (or "coach_message") step, whether CoachChat
  // mounted before or after the tour advanced. Idempotent via hasWelcomed ref.
  useEffect(() => {
    if ((tourStep === "coach" || tourStep === "coach_message") && profile && !hasWelcomed.current) {
      hasWelcomed.current = true;
      sendWelcome(profile);
    }
  }, [tourStep, profile]);

  // Pre-fill message and disable input during coach message tour step
  useEffect(() => {
    if (!isTourCoachMessage) return;
    const full = "Sounds good!";
    setInput("");
    const timers = [];
    for (let k = 1; k <= full.length; k++) {
      timers.push(setTimeout(() => setInput(full.slice(0, k)), 1000 + k * 70));
    }
    return () => timers.forEach(clearTimeout);
  }, [isTourCoachMessage]);

  // Auto-disable send button during coach message step
  const sendButtonDisabled = () => {
    return !input.trim() || sending || isTourCoachMessage && input !== "Sounds good!";
  };

  const sendWelcome = async (prof) => {
    // Use tourStepRef (reliable, updated via custom event) instead of window.fitabilityTourStep (racy)
    const inCoachTour = tourStepRef.current === "coach" || tourStepRef.current === "coach_message";
    // Instant intro during the onboarding tour (skip the slow LLM round-trip)
    if (inCoachTour) {
      // USER-AUTHORED COPY — do not overwrite or regenerate — preserved character-for-character
      setMessages([{ role: "assistant", content: `Hi ${prof?.display_name || "there"}! 💪 I'm your FitAbility Coach. I can help you adjust and fine-tune your workouts, suggest modifications for exercises, answer fitness questions, and keep you moving safely.\n\nKeep me updated on any changes to your health and conditions — whether things are improving, getting tougher, or anything that affects your workouts. The better I understand you, the better I can support your fitness journey. I'll remember what you tell me and tailor your plan around it.` }]);
      // Only advance if we're still on the "coach" step; if already on "coach_message", don't re-dispatch
      if (tourStepRef.current === "coach") {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("fitability-tour-step-change", { detail: { tourStep: "coach_message" } }));
        }, 300);
      }
      return;
    }
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
      if (tourStepRef.current === "coach") {
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

      // Advance tour after coach replies — fire action so OnboardingTour handles the step change
      if (isTourCoachMessage && userText.toLowerCase().includes("sounds good")) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("fitability-tour-action", { detail: "coach_message_sent" }));
        }, 4000);
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
    <div className="fixed top-16 bottom-16 left-0 right-0 z-30 flex flex-col">
      {/* Coach Header */}
      <div className="flex-shrink-0 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-semibold text-sm">FitAbility Coach</div>
          <div className="text-xs text-muted-foreground">Chat resets weekly · your preferences are always remembered</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 bg-background" style={{ paddingBottom: `${textareaHeight + 16}px` }}>
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

        {wasReset && (
          <div className="mb-3 mt-1 text-center text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2">
            🔄 Your weekly chat history was cleared — but your coach still remembers your preferences and history.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg, i) =>
          <MessageBubble key={i} message={msg} isTourCoachMessage={isTourCoachMessage} />
          )}
        </div>


        <div ref={messagesEndRef} />
      </div>

      {isTourCoachMessage &&
      <style>{`
          [data-tour-coach-input] {
            color: hsl(var(--foreground)) !important;
          }
          [data-tour-coach-input]::placeholder {
            color: hsl(var(--foreground)) !important;
          }
          [data-tour-coach-input]::selection {
            background: hsl(var(--primary)) !important;
            color: hsl(var(--primary-foreground)) !important;
          }
        `}</style>
      }



      {/* Input */}
      <div className={`flex-shrink-0 border-t border-border bg-card px-4 py-2 ${isTourCoachMessage ? "pointer-events-none" : ""}`}>
        <div className="flex gap-2 items-center">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Tell me how your workout is going…"
            className={`flex-1 rounded-xl px-3 py-2 my-2 border border-input bg-transparent resize-none overflow-hidden ${isTourCoachMessage ? "text-foreground" : ""}`}
            disabled={sending || isTourCoachMessage}
            data-tour-coach-input
            style={{ minHeight: '2.25rem', fontFamily: 'inherit', fontSize: 'inherit' }} />

          {mic.supported && !isTourCoachMessage && (
            <Button
              type="button"
              onClick={mic.toggle}
              disabled={sending}
              size="icon"
              variant={mic.listening ? "destructive" : "outline"}
              className="rounded-xl my-2 flex-shrink-0"
              title={mic.listening ? "Stop" : "Speak"}
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}

          {isTourCoachMessage && (
            <style>{`
              @keyframes coach-send-pulse {
                0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(196, 181, 253, 0.5); }
                50%      { transform: scale(1.04); box-shadow: 0 0 16px 4px rgba(196, 181, 253, 0.5); }
              }
              [data-tour-send-btn="true"] {
                animation: coach-send-pulse 1.1s ease-in-out infinite !important;
                border: 2px solid #c4b5fd !important;
                outline: 2px solid #c4b5fd !important;
                outline-offset: 2px !important;
                pointer-events: auto !important;
              }
              @keyframes coach-send-arrow-bounce {
                0%, 100% { transform: translate(-30%, -20%); }
                50%      { transform: translate(10%, 30%); }
              }
              .tour-send-arrow {
                animation: coach-send-arrow-bounce 1s ease-in-out infinite;
              }
            `}</style>
          )}
          {isTourCoachMessage && (
            <div className="tour-send-arrow fixed left-1/2 top-1/2 z-[100] pointer-events-none" style={{ transform: "translate(-30%, -20%)" }}>
              <ArrowDownRight className="w-10 h-10 text-[#c4b5fd] drop-shadow-[0_0_8px_rgba(196,181,253,0.6)]" />
            </div>
          )}
          <Button
            onClick={() => sendMessage()}
            data-tour-send-btn={isTourCoachMessage ? "true" : undefined}
            disabled={sendButtonDisabled()}
            size="icon"
            className="rounded-xl my-2 flex-shrink-0"
            style={isTourCoachMessage ? { pointerEvents: "auto" } : {}}
            data-tour-coach-send={isTourCoachMessage ? "true" : undefined}>
            
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>);

}