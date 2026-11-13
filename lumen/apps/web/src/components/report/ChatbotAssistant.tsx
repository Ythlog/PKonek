"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, MessageCircle, RotateCcw, Send, Sparkles, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { getToken } from "@/lib/api/session";
import { USE_MOCKS } from "@/lib/env";

type Message = { role: "assistant" | "user"; content: string };
const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I can help you explain a Pasig community concern clearly. Tell me what's happening, and we can refine the details together. I won't add facts you haven't shared.",
};

async function requestJson<T>(path: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data: { detail?: string } & Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    // Keep useful status information when a stopped service responds with an HTML error.
  }
  if (!response.ok) {
    const detail = data.detail || (response.status >= 500
      ? `The chatbot backend returned HTTP ${response.status}. Check its terminal for the error details.`
      : `The chatbot service returned HTTP ${response.status}.`);
    throw new Error(String(detail));
  }
  return data as T;
}

export function ChatbotAssistant({ onUseDraft }: { onUseDraft: (draft: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function send() {
    const message = input.trim();
    if (!message || loading || USE_MOCKS) return;
    const token = getToken();
    if (!token) {
      setError("Please sign in again before using the writing assistant.");
      return;
    }

    setInput("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);
    try {
      let activeSession = sessionToken;
      if (!activeSession) {
        const created = await requestJson<{ session_token: string }>("/chatbot/sessions", token, { title: "PKonek complaint writing help" });
        activeSession = created.session_token;
        if (!activeSession) throw new Error("The chatbot didn't return a session. Please try again.");
        setSessionToken(activeSession);
      }
      const result = await requestJson<{ messages: Message[] }>("/chatbot/messages", token, {
        session_token: activeSession,
        message,
      });
      if (!Array.isArray(result.messages) || !result.messages.length) {
        throw new Error("The chatbot returned no readable messages. You can keep describing the issue here.");
      }
      setMessages(result.messages.filter((item) => (item.role === "assistant" || item.role === "user") && typeof item.content === "string"));
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : "The chatbot service is unavailable.";
      setInput(message);
      setError(/failed to fetch|networkerror|load failed/i.test(messageText)
        ? "Couldn't reach the chatbot service. Start chatbot_backend on port 8003, then try again."
        : messageText);
    } finally {
      setLoading(false);
    }
  }

  function newConversation() {
    setSessionToken(null);
    setMessages([WELCOME]);
    setInput("");
    setError(null);
  }

  return (
    <section className="grid gap-3 rounded-card border border-brand-600/20 bg-brand-50/60 p-4" aria-label="Lumen complaint writing chatbot">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-ink"><Bot aria-hidden size={18} /> Lumen complaint assistant</h3>
          <p className="mt-1 text-sm text-muted">Chat through your concern, then use a response as your report description.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" leadingIcon={<RotateCcw aria-hidden size={15} />} onClick={newConversation} disabled={loading || !sessionToken}>
          New chat
        </Button>
      </div>

      {USE_MOCKS ? (
        <Alert tone="info" title="Live API mode required">Switch `NEXT_PUBLIC_USE_MOCKS` off and run the chatbot service to chat with Lumen.</Alert>
      ) : (
        <>
          <div className="grid max-h-80 gap-3 overflow-y-auto rounded-control border border-border bg-surface p-3" aria-live="polite" aria-label="Chat messages">
            {messages.map((item, index) => (
              <div key={`${index}-${item.role}`} className={`flex items-start gap-2 ${item.role === "user" ? "flex-row-reverse" : ""}`}>
                <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  {item.role === "assistant" ? <Bot size={15} /> : <UserRound size={15} />}
                </span>
                <div className={`grid max-w-[88%] gap-2 rounded-card px-3 py-2 ${item.role === "user" ? "bg-brand-700 text-white" : "bg-page text-ink"}`}>
                  <p className="whitespace-pre-wrap text-sm">{item.content}</p>
                  {item.role === "assistant" && index > 0 && (
                    <button type="button" onClick={() => onUseDraft(item.content)} className="inline-flex w-fit items-center gap-1 rounded-chip text-xs font-semibold text-brand-600 hover:text-brand-700">
                      <Sparkles aria-hidden size={13} /> Use as report description
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && <p className="ml-9 flex items-center gap-2 text-sm text-muted"><MessageCircle aria-hidden size={15} className="animate-pulse" /> Lumen is replying…</p>}
            <div ref={endRef} />
          </div>

          {error && <Alert tone="warning" title="Writing assistant unavailable">{error}</Alert>}

          <div className="grid gap-2">
            <label className="sr-only" htmlFor="lumen-chat-input">Message Lumen</label>
            <Textarea
              id="lumen-chat-input"
              rows={2}
              maxLength={5000}
              value={input}
              disabled={loading}
              placeholder="Describe what happened or ask a follow-up…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">Check all details before using them in your report.</p>
              <Button type="button" size="sm" disabled={!input.trim() || loading} loading={loading} leadingIcon={<Send aria-hidden size={15} />} onClick={() => void send()}>
                Send
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
