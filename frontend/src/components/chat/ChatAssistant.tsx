"use client";

import { FormEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ArrowUp, ChartPie, PiggyBank, RotateCcw, Target, Trash2, Wallet, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { currentLanguage, LANGUAGES, t } from "@/lib/i18n";
import { useFeedback } from "@/components/ui/Feedback";
import AssistantLogo from "./AssistantLogo";

type Message = { id: number | string; role: "user" | "assistant"; content: string; created_at?: string };
type SendResponse = { messages: Message[]; suggestions: string[] };

// Other parts of the app can open the assistant (optionally with a question):
// window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: "How much did I spend?" }))
export const OPEN_CHAT_EVENT = "smartwallet:open-chat";
// Used by the app tour to close the panel again
export const CLOSE_CHAT_EVENT = "smartwallet:close-chat";

// Same icons and tones as the rest of the app (wallet, budgets, categories, goals)
const STARTERS = [
  { icon: Wallet, tone: "bg-brand-soft text-brand", text: "How much did I spend this month?" },
  { icon: PiggyBank, tone: "bg-amber-50 text-amber-600", text: "Which budget is closest to its limit?" },
  { icon: ChartPie, tone: "bg-sky-50 text-sky-600", text: "Where does most of my money go?" },
  { icon: Target, tone: "bg-violet-50 text-violet-600", text: "How much should I save each month for my goals?" },
];
const KNOWS_ABOUT = [
  { icon: ArrowLeftRight, label: "Transactions" },
  { icon: PiggyBank, label: "Budgets" },
  { icon: Target, label: "Goals" },
];
const MAX_LENGTH = 500;
const GREETING_KEY = "smartwallet.chat.greeted";

// Amounts and percentages stand out like everywhere else in the app
const AMOUNT = /(-?\d[\d,.  ]*\s?(?:MAD|DH|USD|EUR|\$|€)|(?:\$|€)\s?\d[\d,.]*|-?\d+(?:[.,]\d+)?\s?%)/g;

function highlight(text: string) {
  return text.split(AMOUNT).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} dir="ltr" className="font-semibold text-brand-dark">
        {part}
      </span>
    ) : (
      part
    )
  );
}

// "- item" lines become a real list, other lines stay paragraphs
function FormattedAnswer({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="space-y-1">
          {bullets.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{highlight(item)}</span>
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    if (bullet) bullets.push(bullet[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={`p-${blocks.length}`}>{highlight(line)}</p>);
    }
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

function time(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(LANGUAGES[currentLanguage()].locale, { hour: "2-digit", minute: "2-digit" });
}

function Thinking() {
  return (
    <div className="flex items-end gap-2">
      <AssistantLogo size={30} className="shrink-0" />
      <div className="flex items-center gap-2 rounded-2xl rounded-es-md border border-line bg-white px-3.5 py-2.5 shadow-sm">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </span>
        <span className="text-xs text-muted">{t("Checking your numbers...")}</span>
      </div>
    </div>
  );
}

// Floating button + chat panel, available on every page once logged in
export default function ChatAssistant() {
  const { confirm } = useFeedback();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstName = user?.name.split(" ")[0] ?? "";

  // A small "Hi" bubble next to the button, once per session
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(GREETING_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const show = setTimeout(() => {
      setGreeting(true);
      try {
        sessionStorage.setItem(GREETING_KEY, "1");
      } catch {
        // ignore
      }
    }, 1500);
    const hide = setTimeout(() => setGreeting(false), 9000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  // Load the saved conversation the first time the panel opens
  useEffect(() => {
    if (!open || messages !== null) return;
    api<Message[]>("/api/chat")
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [open, messages]);

  useEffect(() => {
    if (open) {
      setGreeting(false);
      inputRef.current?.focus();
    }
  }, [open]);

  // Keep the newest message in view
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending, error, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim().slice(0, MAX_LENGTH);
      if (!question || sending) return;
      setError("");
      setInput("");
      setSuggestions([]);
      setSending(true);
      // Show the question right away; the server saves it together with the answer
      const pendingId = `pending-${Date.now()}`;
      setMessages((list) => [...(list ?? []), { id: pendingId, role: "user", content: question, created_at: new Date().toISOString() }]);
      try {
        const result = await api<SendResponse>("/api/chat", {
          method: "POST",
          body: JSON.stringify({ message: question, language: currentLanguage() }),
        });
        setMessages((list) => [...(list ?? []).filter((m) => m.id !== pendingId), ...result.messages]);
        setSuggestions(result.suggestions);
      } catch (err) {
        setMessages((list) => (list ?? []).filter((m) => m.id !== pendingId));
        setFailedQuestion(question);
        setError((err as Error).message);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sending]
  );

  // Open from anywhere in the app
  useEffect(() => {
    const onOpen = (event: Event) => {
      setOpen(true);
      const question = (event as CustomEvent<string | undefined>).detail;
      if (question) send(question);
    };
    const onClose = () => setOpen(false);
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    window.addEventListener(CLOSE_CHAT_EVENT, onClose);
    return () => {
      window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
      window.removeEventListener(CLOSE_CHAT_EVENT, onClose);
    };
  }, [send]);

  async function clear() {
    const ok = await confirm({
      title: t("Start a new conversation?"),
      message: t("Your previous questions and answers will be deleted. Your financial data is not affected."),
      confirmLabel: t("Delete"),
      danger: true,
    });
    if (!ok) return;
    await api("/api/chat", { method: "DELETE" }).catch(() => undefined);
    setMessages([]);
    setSuggestions([]);
    setError("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(input);
    }
  }

  const empty = messages !== null && messages.length === 0 && !sending;

  return (
    <>
      {/* ---------- Floating button (above the phone tab bar) ---------- */}
      {!open && (
        <div className="fixed bottom-24 end-4 z-30 flex flex-col items-end gap-2 lg:bottom-6 lg:end-6">
          {greeting && (
            <button
              onClick={() => setOpen(true)}
              className="rise max-w-[15rem] rounded-2xl rounded-ee-md border border-line bg-white px-3.5 py-2.5 text-start text-xs text-ink shadow-xl shadow-slate-900/10"
            >
              <span className="block font-semibold">{t("Hi {name}!", { name: firstName })} 👋</span>
              <span className="text-muted">{t("Ask me anything about your money.")}</span>
            </button>
          )}
          {/* Only the logo; the name slides out on hover or keyboard focus */}
          <button
            onClick={() => setOpen(true)}
            aria-label={t("Ask the assistant")}
            data-tour="assistant"
            className="group relative flex h-14 items-center rounded-2xl bg-gradient-to-br from-[#0f1f17] to-brand-dark p-2 text-white shadow-xl shadow-brand/25 ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:pe-4 focus-visible:pe-4"
          >
            {/* Soft pulse behind the logo */}
            <span className="absolute start-2 top-2 h-10 w-10 animate-ping rounded-xl bg-brand/30 [animation-duration:2.5s] group-hover:hidden" aria-hidden="true" />
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
              <AssistantLogo size={34} />
            </span>
            <span
              aria-hidden="true"
              className="max-w-0 overflow-hidden whitespace-nowrap text-start opacity-0 transition-all duration-300 group-hover:ms-2.5 group-hover:max-w-[12rem] group-hover:opacity-100 group-focus-visible:ms-2.5 group-focus-visible:max-w-[12rem] group-focus-visible:opacity-100"
            >
              <span className="block text-sm font-semibold leading-tight">{t("SmartWallet AI")}</span>
              <span className="block text-[11px] leading-tight text-white/60">{t("Ask about your money")}</span>
            </span>
          </button>
        </div>
      )}

      {/* ---------- Chat panel ---------- */}
      {open && (
        <section
          role="dialog"
          aria-label={t("SmartWallet AI")}
          className="fixed inset-0 z-40 flex flex-col bg-white sm:inset-auto sm:bottom-6 sm:end-6 sm:h-[min(660px,calc(100vh-3rem))] sm:w-[410px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-line sm:shadow-2xl sm:shadow-slate-900/25"
        >
          {/* Header: same green as the app's balance card */}
          <header data-tour="chat-header" className="relative overflow-hidden bg-gradient-to-br from-[#0f1f17] via-brand-dark to-brand px-4 pb-3 pt-3.5 text-white">
            <span className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-20 start-10 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" aria-hidden="true" />

            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <AssistantLogo size={36} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-[15px] font-semibold">{t("SmartWallet AI")}</h2>
                <p className="flex items-center gap-1.5 truncate text-[11px] text-white/75">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  </span>
                  {t("Online · reads your data live")}
                </p>
              </div>
              {messages && messages.length > 0 && (
                <button onClick={clear} aria-label={t("Start a new conversation")} title={t("Start a new conversation")} className="rounded-lg p-2 text-white/75 transition hover:bg-white/15 hover:text-white">
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label={t("Close")} className="rounded-lg p-2 text-white/75 transition hover:bg-white/15 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* What the assistant can see */}
            <div className="relative mt-3 flex items-center gap-1.5 text-[10px]">
              <span className="text-white/60">{t("Connected to")}</span>
              {KNOWS_ABOUT.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 font-medium" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                  <Icon size={11} />
                  {t(label)}
                </span>
              ))}
            </div>
          </header>

          {/* Messages */}
          <div ref={listRef} data-tour="chat-body" className="thin-scroll flex-1 space-y-4 overflow-y-auto bg-background px-4 py-4" aria-live="polite">
            {messages === null && (
              <div className="flex justify-center py-10">
                <AssistantLogo size={44} className="float" />
              </div>
            )}

            {empty && (
              <div className="flex flex-col items-center pt-2 text-center">
                <span className="float relative">
                  <span className="absolute inset-0 -z-0 rounded-full bg-brand/15 blur-xl" aria-hidden="true" />
                  <AssistantLogo size={72} className="relative" />
                </span>
                <p className="mt-3 font-display text-lg font-semibold text-ink">
                  {firstName ? t("Hi {name}!", { name: firstName }) : t("Ask me about your money")} 👋
                </p>
                <p className="mt-1 max-w-[18rem] text-xs text-muted">
                  {t("I read your transactions, budgets and savings goals to answer. Try one of these:")}
                </p>
                <div className="mt-4 grid w-full grid-cols-2 gap-2">
                  {STARTERS.map(({ icon: Icon, tone, text }) => (
                    <button
                      key={text}
                      onClick={() => send(t(text))}
                      className="group flex flex-col items-start gap-2 rounded-2xl border border-line bg-white p-3 text-start text-xs font-medium text-ink transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md hover:shadow-slate-900/5"
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition group-hover:scale-110 ${tone}`}>
                        <Icon size={16} />
                      </span>
                      {t(text)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages?.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex flex-col items-end">
                  <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-ee-md bg-gradient-to-br from-brand to-brand-dark px-3.5 py-2 text-sm text-white shadow-sm shadow-brand/20">
                    {message.content}
                  </p>
                  <span className="mt-1 pe-1 text-[10px] text-muted">{time(message.created_at)}</span>
                </div>
              ) : (
                <div key={message.id} className="flex items-end gap-2">
                  <AssistantLogo size={30} className="mb-5 shrink-0" />
                  <div className="min-w-0 max-w-[85%]">
                    <div className="rounded-2xl rounded-es-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink shadow-sm">
                      <FormattedAnswer text={message.content} />
                    </div>
                    <span className="mt-1 block ps-1 text-[10px] text-muted">
                      {t("SmartWallet AI")} · {time(message.created_at)}
                    </span>
                  </div>
                </div>
              )
            )}

            {sending && <Thinking />}

            {error && (
              <div role="alert" className="flex gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                <div>
                  <p>{error}</p>
                  <button onClick={() => send(failedQuestion)} className="mt-1.5 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                    <RotateCcw size={12} />
                    {t("Try again")}
                  </button>
                </div>
              </div>
            )}

            {!empty && suggestions.length > 0 && !sending && (
              <div className="flex flex-wrap gap-2 ps-9">
                {suggestions.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => send(chip)}
                    className="rounded-full border border-brand/25 bg-white px-3 py-1.5 text-start text-xs font-medium text-brand-dark transition hover:border-brand hover:bg-brand-soft"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} data-tour="chat-input" className="border-t border-line bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2 rounded-2xl border border-line bg-background p-1.5 ps-3 transition focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={t("Type your question...")}
                aria-label={t("Your question")}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label={t("Send")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm shadow-brand/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                <ArrowUp size={18} />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[10px] text-muted">
              <span>{t("General budgeting tips only, not professional financial advice.")}</span>
              {input.length > 400 && <span dir="ltr">{input.length}/{MAX_LENGTH}</span>}
            </div>
          </form>
        </section>
      )}
    </>
  );
}
