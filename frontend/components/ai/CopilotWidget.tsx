'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Brain,
  X,
  RotateCcw,
  Send,
  Copy,
  Check,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  FileText,
  Mail,
  Scale,
  BarChart3,
  Loader2,
  History,
  Trash2,
  Plus,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopilotMessage, CopilotSession } from '@/types';
import { sendCopilotMessage } from '@/lib/ai';

const STORAGE_KEY = 'insurflow_copilot_history';
const SESSIONS_STORAGE_KEY = 'insurflow_copilot_sessions';

const INITIAL_PROMPTS = [
  {
    icon: FileText,
    label: 'Polices à renouveler',
    prompt: 'Quelles sont les polices à renouveler ce mois ?',
  },
  {
    icon: Mail,
    label: 'Email relance impayé',
    prompt: 'Rédiger un email de relance de quittance impayée',
  },
  {
    icon: Scale,
    label: 'Franchise Tous Risques',
    prompt: 'Explication franchise Tous Risques vs Tiers Collision',
  },
  {
    icon: BarChart3,
    label: 'Synthèse portefeuille',
    prompt: "Synthèse de l'activité du portefeuille",
  },
];

const getDefaultWelcomeMessage = (): CopilotMessage => ({
  id: 'init-1',
  role: 'assistant',
  content:
    'Bonjour ! Je suis **InsurFlow Copilot**, votre assistant expert en courtage et gestion d\'assurances au Maroc (ACAPS / Loi 17-99).\n\nComment puis-je vous assister aujourd\'hui ?',
  timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
});

/**
 * Formats a timestamp into human-readable French date string,
 * e.g. "Aujourd'hui à 13:41", "Hier à 16:20", or "23 août à 14:15".
 */
function formatSessionTimestamp(timestampInput?: number | string | Date): string {
  if (!timestampInput) {
    return `Aujourd'hui à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const date =
    typeof timestampInput === 'number'
      ? new Date(timestampInput)
      : typeof timestampInput === 'string' && !isNaN(Number(timestampInput))
      ? new Date(Number(timestampInput))
      : new Date(timestampInput);

  if (isNaN(date.getTime())) {
    return String(timestampInput);
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Aujourd'hui à ${timeStr}`;
  } else if (isYesterday) {
    return `Hier à ${timeStr}`;
  } else {
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    return `${day} ${month} à ${timeStr}`;
  }
}

export default function CopilotWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CopilotSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const [messages, setMessages] = useState<CopilotMessage[]>([getDefaultWelcomeMessage()]);

  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    'Quelles sont les polices à renouveler ce mois ?',
    'Rédiger un email de relance de quittance impayée',
    'Explication franchise Tous Risques vs Tiers Collision',
    'Synthèse de l\'activité du portefeuille',
  ]);


  // ── 1. Fix localStorage Overwrite on Mount with isLoaded guard ───────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let loadedMessages: CopilotMessage[] = [];
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedMessages = parsed;
          setMessages(parsed);
        }
      }

      const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        if (Array.isArray(parsedSessions)) {
          setSessions(parsedSessions);
          if (parsedSessions.length > 0) {
            setCurrentSessionId(parsedSessions[0].id);
          }
        }
      } else if (loadedMessages.length > 1) {
        // Synthesize an initial session if past messages exist
        const firstUser = loadedMessages.find((m) => m.role === 'user');
        if (firstUser) {
          const autoSession: CopilotSession = {
            id: `sess-${Date.now()}`,
            title: firstUser.content.slice(0, 50),
            timestamp: formatSessionTimestamp(Date.now()),
            createdAt: Date.now(),
            messages: loadedMessages,
            preview: loadedMessages[loadedMessages.length - 1]?.content.slice(0, 80) || '',
          };
          setSessions([autoSession]);
          setCurrentSessionId(autoSession.id);
        }
      }
    } catch (err) {
      console.error('Failed to load chat history', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save current active messages to localStorage once loaded
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat history', err);
    }
  }, [messages, isLoaded]);

  // Save conversation sessions to localStorage once loaded
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (err) {
      console.error('Failed to save copilot sessions', err);
    }
  }, [sessions, isLoaded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !showHistory) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, showHistory, messages, loading]);

  // ── Helper to sync session list with new messages ───────────────────────────
  const updateSessionRecord = (newMessages: CopilotMessage[], userQuery: string) => {
    const now = Date.now();
    const timestampStr = formatSessionTimestamp(now);
    const lastMsg = newMessages[newMessages.length - 1];
    const previewText = (lastMsg?.content || '')
      .replace(/[\n*#`_]/g, ' ')
      .trim()
      .slice(0, 90);

    setSessions((prevSessions) => {
      const activeId = currentSessionId || `sess-${now}`;
      if (!currentSessionId) {
        setCurrentSessionId(activeId);
      }

      const existingIndex = prevSessions.findIndex((s) => s.id === activeId);
      const sessionTitle =
        existingIndex >= 0 && prevSessions[existingIndex].title
          ? prevSessions[existingIndex].title
          : userQuery.length > 50
          ? `${userQuery.slice(0, 48)}...`
          : userQuery;

      const updatedSession: CopilotSession = {
        id: activeId,
        title: sessionTitle,
        timestamp: timestampStr,
        createdAt: now,
        messages: newMessages,
        preview: previewText,
      };

      if (existingIndex >= 0) {
        const copy = [...prevSessions];
        copy.splice(existingIndex, 1);
        return [updatedSession, ...copy];
      } else {
        return [updatedSession, ...prevSessions];
      }
    });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    // Full multi-turn conversation history
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Sync current session with user message turn
    updateSessionRecord(newMessages, query);

    try {
      const res = await sendCopilotMessage(newMessages, pathname);
      const botMessage: CopilotMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...newMessages, botMessage];
      setMessages(finalMessages);
      updateSessionRecord(finalMessages, query);

      if (res.suggestedActions && res.suggestedActions.length > 0) {
        setSuggestedActions(res.suggestedActions);
      }
    } catch (err) {
      console.error('Failed to send message to Copilot:', err);
      const errorMessage: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          '⚠️ Une erreur est survenue lors de la communication avec le serveur. Veuillez réessayer ou vérifier votre connexion.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      updateSessionRecord(finalMessages, query);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── Reset current thread / Start new conversation ──────────────────────────
  const handleReset = () => {
    setCurrentSessionId(null);
    const freshWelcome = getDefaultWelcomeMessage();
    setMessages([freshWelcome]);
    setSuggestedActions([
      'Quelles sont les polices à renouveler ce mois ?',
      'Rédiger un email de relance de quittance impayée',
      'Explication franchise Tous Risques vs Tiers Collision',
      'Synthèse de l\'activité du portefeuille',
    ]);
    setShowHistory(false);
  };

  // ── Load a specific conversation thread from History ────────────────────────
  const handleSelectSession = (session: CopilotSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages && session.messages.length > 0 ? session.messages : [getDefaultWelcomeMessage()]);
    setShowHistory(false);
  };

  // ── Delete a single conversation thread from History ────────────────────────
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(nextSessions);

    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([getDefaultWelcomeMessage()]);
    }
  };

  // ── Clear entire history completely ─────────────────────────────────────────
  const handleClearAllHistory = () => {
    setSessions([]);
    setCurrentSessionId(null);
    const freshWelcome = getDefaultWelcomeMessage();
    setMessages([freshWelcome]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSIONS_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear localStorage keys', e);
    }
    setShowHistory(false);
  };

  const handleCopy = async (text: string, msgId: string | number) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-HTTPS / IP hosting (e.g. http://158.158.112.79:3000)
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };


  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;

          // Header 3
          if (line.startsWith('### ')) {
            return (
              <h5 key={idx} className="font-bold text-foreground text-xs sm:text-sm mt-2 mb-0.5 text-primary">
                {line.replace('### ', '')}
              </h5>
            );
          }

          // Bullet points
          if (line.startsWith('• ') || line.startsWith('- ')) {
            const rawText = line.replace(/^[•\-]\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-primary font-bold">•</span>
                <span>{renderBoldSpans(rawText)}</span>
              </div>
            );
          }

          // Numbered items
          if (/^\d+\.\s/.test(line)) {
            const match = line.match(/^(\d+\.)\s*(.*)/);
            if (match) {
              return (
                <div key={idx} className="flex items-start gap-1.5 pl-1">
                  <span className="text-primary font-semibold font-mono">{match[1]}</span>
                  <span>{renderBoldSpans(match[2])}</span>
                </div>
              );
            }
          }

          return <p key={idx}>{renderBoldSpans(line)}</p>;
        })}
      </div>
    );
  };

  const renderBoldSpans = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-primary">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* ── Floating Trigger Button ────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="relative group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-primary via-indigo-600 to-violet-600 text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Ouvrir InsurFlow Copilot"
        >
          <span className="absolute -inset-1 rounded-full bg-primary/35 animate-ping opacity-40 pointer-events-none" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background" />
          </span>

          {isOpen ? (
            <ChevronDown className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse" />
              <Brain className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-emerald-300" />
            </div>
          )}
        </button>
      </div>

      {/* ── Chat Window / Popover Drawer ───────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[440px] md:w-[470px] h-[590px] max-h-[82vh] rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 slide-in-from-bottom-6 duration-200">
          
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/20 flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground">InsurFlow Copilot</h3>
                  <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.2 rounded">
                    IA Courtier
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[11px] text-muted-foreground">Actif • ACAPS & Loi 17-99</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Historique Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-colors ${
                  showHistory
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                onClick={() => setShowHistory((prev) => !prev)}
                title={showHistory ? 'Retourner à la conversation' : 'Historique des conversations'}
              >
                <History className="w-4 h-4" />
              </Button>

              {/* Reset / New Chat Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={handleReset}
                title="Nouvelle conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>

              {/* Close Widget Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => setIsOpen(false)}
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── HISTOIRE PANEL OVERLAY ─────────────────────────────────────── */}
          {showHistory ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-background/95 animate-in fade-in-50 slide-in-from-right-4 duration-200">
              {/* History Header Sub-bar */}
              <div className="px-4 py-2.5 bg-muted/30 border-b border-border/80 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground -ml-1 gap-1"
                    onClick={() => setShowHistory(false)}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Retour</span>
                  </Button>
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Historique ({sessions.length})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={handleReset}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nouveau</span>
                  </Button>
                  {sessions.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                      onClick={handleClearAllHistory}
                      title="Effacer tout l'historique"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Effacer</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {sessions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
                      <History className="w-6 h-6 opacity-60" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">Aucun historique</p>
                      <p className="text-xs text-muted-foreground max-w-[260px]">
                        Vos conversations passées et questions posées à l&apos;IA s&apos;afficheront ici automatiquement.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 text-xs gap-1.5 rounded-xl bg-primary text-primary-foreground"
                      onClick={() => {
                        handleReset();
                        setShowHistory(false);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Commencer un échange</span>
                    </Button>
                  </div>
                ) : (
                  sessions.map((session) => {
                    const isActive = session.id === currentSessionId;
                    const msgCount = session.messages ? session.messages.filter((m) => m.role === 'user').length : 1;

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className={`group relative p-3 rounded-xl border transition-all cursor-pointer text-left ${
                          isActive
                            ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/30'
                            : 'bg-card hover:bg-muted/50 border-border/70 hover:border-primary/30 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-semibold text-foreground text-xs truncate max-w-[200px] sm:max-w-[240px]">
                                  {session.title || 'Conversation sans titre'}
                                </h4>
                                {isActive && (
                                  <span className="text-[9px] font-medium bg-primary/20 text-primary px-1.5 py-0.2 rounded-full whitespace-nowrap">
                                    En cours
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="font-medium text-primary/80">{session.timestamp}</span>
                                <span>•</span>
                                <span>{msgCount} {msgCount > 1 ? 'questions' : 'question'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0 opacity-80 group-hover:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              title="Supprimer cette conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {session.preview && (
                          <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-1.5 pl-9">
                            {session.preview}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* History Footer */}
              {sessions.length > 0 && (
                <div className="p-3 border-t border-border/80 bg-card/60 flex items-center justify-between flex-shrink-0 text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    Cliquez sur un échange pour le reprendre
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                    onClick={handleClearAllHistory}
                  >
                    Effacer l&apos;historique
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* ── ACTIVE CHAT VIEW ─────────────────────────────────────────── */
            <>
              {/* Quick Action Suggested Chips */}
              <div className="px-3 py-2 border-b border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
                {INITIAL_PROMPTS.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/80 border border-border/80 hover:border-primary/50 text-[11px] font-medium text-muted-foreground hover:text-primary transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-2xs hover:shadow-xs"
                    >
                      <ItemIcon className="w-3 h-3 text-primary" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs sm:text-sm">
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`relative group rounded-2xl px-3.5 py-2.5 ${
                            isUser
                              ? 'bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground rounded-tr-xs shadow-md shadow-primary/10'
                              : 'bg-muted/40 border border-border/80 text-foreground rounded-tl-xs shadow-2xs'
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            renderFormattedContent(msg.content)
                          )}

                          {!isUser && msg.content.length > 20 && (
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.content, msg.id || index)}
                              className="absolute -top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 shadow-xs cursor-pointer z-10"
                              title="Copier la réponse"
                            >
                              {copiedId === (msg.id || index) ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Copié !</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copier</span>
                                </>
                              )}
                            </button>
                          )}

                        </div>

                        {/* Small Timestamp below each message bubble */}
                        <div
                          className={`flex items-center gap-1 text-[10px] text-muted-foreground px-1 ${
                            isUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span>
                            {msg.timestamp ||
                              new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 text-primary-foreground mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex gap-2.5 justify-start animate-in fade-in-50">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="rounded-2xl rounded-tl-xs px-3.5 py-2.5 bg-muted/40 border border-border/80 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">InsurFlow Copilot analyse votre demande...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Dynamic Follow-up Suggestions */}
              {suggestedActions.length > 0 && !loading && (
                <div className="px-3 py-1.5 bg-muted/15 border-t border-border/50 flex flex-wrap gap-1.5">
                  {suggestedActions.slice(0, 3).map((action, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(action)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors cursor-pointer text-left truncate max-w-full"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Footer */}
              <div className="p-3 border-t border-border bg-card flex items-end gap-2 flex-shrink-0">
                <textarea
                  ref={inputRef as any}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez une question sur vos polices, relances, sinistres..."
                  className="flex-1 max-h-24 min-h-[38px] resize-none rounded-xl border border-input bg-muted/30 px-3 py-2 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                />
                <Button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex-shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
