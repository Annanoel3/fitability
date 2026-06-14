import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Plus, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm max-w-none [&>p]:mb-2 [&>ul]:pl-4 [&>ul]:list-disc [&>ol]:pl-4 [&>ol]:list-decimal">
            {message.content || "…"}
          </ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, i) => {
          const dp = tc.display_projection;
          if (dp?.hide_details && dp?.details_redacted) {
            const label =
              ["pending","running","in_progress"].includes(tc.status)
                ? dp.active_label
                : ["failed","error"].includes(tc.status)
                ? dp.error_label
                : dp.label;
            return (
              <div key={i} className="mt-2 text-xs text-muted-foreground italic">{label}</div>
            );
          }
          return (
            <div key={i} className="mt-2 text-xs bg-muted/50 rounded-lg px-3 py-2 text-muted-foreground">
              <span className="font-medium">{tc.name}</span>
              {["pending","running","in_progress"].includes(tc.status) && (
                <Loader2 className="w-3 h-3 inline ml-1 animate-spin" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CoachChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeConvId) return;
    const unsub = base44.agents.subscribeToConversation(activeConvId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [activeConvId]);

  const loadConversations = async () => {
    setLoading(true);
    const convs = await base44.agents.listConversations({ agent_name: "fitness_coach" });
    setConversations(convs);
    if (convs.length > 0) {
      await openConversation(convs[0]);
    } else {
      await startNewConversation();
    }
    setLoading(false);
  };

  const openConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConvId(full.id);
    setMessages(full.messages || []);
  };

  const startNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: "fitness_coach",
      metadata: { name: `Chat ${new Date().toLocaleDateString()}` }
    });
    setActiveConvId(conv.id);
    setMessages([]);
    setConversations(prev => [conv, ...prev]);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !activeConvId) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const conv = await base44.agents.getConversation(activeConvId);
    await base44.agents.addMessage(conv, { role: "user", content: text });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-heading font-semibold text-sm">FitAbility Coach</div>
            <div className="text-xs text-muted-foreground">Your adaptive fitness assistant</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={startNewConversation} title="New chat">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">Hi, I'm your FitAbility Coach!</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                I'm here to help you exercise safely. Ask me about modifications, what to do on a hard day, or anything fitness-related.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {["What exercises can I do today?", "My back hurts, what should I skip?", "How do I modify this for a wheelchair?"].map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {sending && (
          <div className="flex justify-start mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card rounded-b-2xl">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach anything…"
            className="flex-1 rounded-xl"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            size="icon"
            className="rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Not medical advice. Consult your healthcare provider.
        </p>
      </div>
    </div>
  );
}