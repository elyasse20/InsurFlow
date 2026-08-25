'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  DollarSign,
  Check,
  CheckCheck,
  RefreshCw,
  X,
  ExternalLink,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import { NotificationItem, NotificationSeverity, NotificationType } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function NotificationDropdown() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CRITICAL' | 'RENEWAL' | 'UNPAID' | 'AI'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count & notifications list
  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get<{ count: number; unreadCount: number }>('/notifications/unread-count'),
        api.get<NotificationItem[]>('/notifications?unreadOnly=false'),
      ]);
      setUnreadCount(countRes.data?.unreadCount ?? countRes.data?.count ?? 0);
      setNotifications(listRes.data || []);
    } catch {
      // Fallback silently for background polling
    }
  };

  // Initial load + 30s Polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Manual trigger refresh/scan
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications/refresh');
      if (res.data?.notifications) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount ?? 0);
      } else {
        await fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Open Copilot with pre-filled context
  const triggerCopilotAction = (prompt: string, autoSend = true) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('insurflow:open-copilot', {
          detail: { prompt, autoSend },
        })
      );
      setIsOpen(false);
    }
  };

  // Navigation or Action dispatcher for notification items
  const handleItemAction = (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }

    if (item.type === 'FRAUDE_IA') {
      triggerCopilotAction(
        `Analyse approfondie de la suspicion de fraude pour la police ${item.policyNumber || item.referenceId || ''} (Client: ${item.clientName || 'Assuré'}). Quelles sont les vérifications ACAPS et mesures conservatoires recommandées ?`,
        true
      );
    } else if (item.type === 'QUITTANCE_IMPAYEE') {
      triggerCopilotAction(
        `Rédiger un email de relance de quittance impayée pour le client ${item.clientName || 'Assuré'} concernant la police ${item.policyNumber || ''} (Montant en souffrance : ${item.amount ? item.amount.toLocaleString('fr-FR') + ' MAD' : 'solde restant'}).`,
        true
      );
    } else if (item.type === 'ECHEANCE_RENOUVELLEMENT' || item.type === 'RENEWAL_30_DAYS' || item.type === 'RENEWAL_15_DAYS') {
      router.push('/operations');
      setIsOpen(false);
    } else if (item.type === 'SINISTRE_ALERTE') {
      triggerCopilotAction(
        `Consulter et expertiser la déclaration de sinistre pour ${item.clientName || ''} (Police: ${item.policyNumber || ''}). Quels sont les points de contrôle ACAPS ?`,
        true
      );
    } else {
      router.push('/operations');
      setIsOpen(false);
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'CRITICAL') return n.severity === 'CRITICAL' || n.type === 'FRAUDE_IA';
      if (activeTab === 'RENEWAL') return n.type === 'ECHEANCE_RENOUVELLEMENT' || n.type === 'RENEWAL_30_DAYS' || n.type === 'RENEWAL_15_DAYS';
      if (activeTab === 'UNPAID') return n.type === 'QUITTANCE_IMPAYEE';
      if (activeTab === 'AI') return n.type === 'FRAUDE_IA' || n.type === 'SINISTRE_ALERTE';
      return true;
    });
  }, [notifications, activeTab]);

  const criticalCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead && (n.severity === 'CRITICAL' || n.type === 'FRAUDE_IA')).length;
  }, [notifications]);

  // Helper for visual badges & icons by type and severity
  const getNotificationBadgeConfig = (type: NotificationType, severity: NotificationSeverity) => {
    if (severity === 'CRITICAL' || type === 'FRAUDE_IA') {
      return {
        badgeBg: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
        iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        icon: AlertTriangle,
        label: type === 'FRAUDE_IA' ? 'Fraude IA' : 'Critique',
        cardBg: 'bg-red-500/[0.04] dark:bg-red-950/20 hover:bg-red-500/[0.08] dark:hover:bg-red-950/30 border-red-500/20',
        actionLabel: type === 'FRAUDE_IA' ? 'Ouvrir IA' : 'Agir d\'urgence',
        actionIcon: Sparkles,
      };
    }

    if (severity === 'WARNING' || type === 'QUITTANCE_IMPAYEE') {
      return {
        badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        icon: type === 'QUITTANCE_IMPAYEE' ? DollarSign : Clock,
        label: type === 'QUITTANCE_IMPAYEE' ? 'Impayé' : 'Attention',
        cardBg: 'bg-amber-500/[0.04] dark:bg-amber-950/20 hover:bg-amber-500/[0.08] dark:hover:bg-amber-950/30 border-amber-500/20',
        actionLabel: type === 'QUITTANCE_IMPAYEE' ? 'Relancer' : 'Consulter',
        actionIcon: type === 'QUITTANCE_IMPAYEE' ? Sparkles : ExternalLink,
      };
    }

    // Default INFO / ECHEANCE_RENOUVELLEMENT
    return {
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: Calendar,
      label: 'Échéance',
      cardBg: 'bg-card hover:bg-muted/50 border-border/50',
      actionLabel: 'Voir l\'opération',
      actionIcon: ExternalLink,
    };
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none cursor-pointer group',
          isOpen
            ? 'bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        title="Alertes & Notifications dynamiques"
        aria-label="Alertes & Notifications"
      >
        <Bell className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-md shadow-red-500/40 border border-white dark:border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[340px] sm:w-[440px] rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-xl ring-1 ring-primary/20 shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Alertes & Notifications</h3>
                  {criticalCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 rounded-md border border-red-500/30">
                      {criticalCount} urgence{criticalCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} alerte${unreadCount > 1 ? 's' : ''} en attente de traitement`
                    : 'Toutes les alertes sont traitées'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
                title="Actualiser et rescanner les alertes"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin text-primary')} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/20 overflow-x-auto text-[11px]">
            <button
              onClick={() => setActiveTab('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'ALL'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('CRITICAL')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1',
                activeTab === 'CRITICAL'
                  ? 'bg-red-500 text-white font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              Critiques
            </button>
            <button
              onClick={() => setActiveTab('RENEWAL')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'RENEWAL'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Échéances
            </button>
            <button
              onClick={() => setActiveTab('UNPAID')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer',
                activeTab === 'UNPAID'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Impayés
            </button>
            <button
              onClick={() => setActiveTab('AI')}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1',
                activeTab === 'AI'
                  ? 'bg-purple-600 text-white font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Sparkles className="w-3 h-3" />
              IA Sinistres
            </button>
          </div>

          {/* Action Bar */}
          {unreadCount > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card text-xs">
              <span className="text-[11px] text-muted-foreground font-medium">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </span>
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marquer tout comme lu
              </button>
            </div>
          )}

          {/* Notification Items List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center px-4 space-y-3">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Aucune alerte en attente</p>
                  <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                    Votre portefeuille est parfaitement à jour. Aucune anomalie détectée pour le moment.
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const config = getNotificationBadgeConfig(item.type, item.severity);
                const IconComponent = config.icon;
                const ActionIcon = config.actionIcon;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-3.5 sm:p-4 transition-all duration-150 relative group border-l-4',
                      config.cardBg,
                      item.severity === 'CRITICAL'
                        ? 'border-l-red-500'
                        : item.severity === 'WARNING'
                        ? 'border-l-amber-500'
                        : 'border-l-blue-500',
                      !item.isRead && 'font-medium'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div
                        className={cn(
                          'p-2 rounded-xl border flex-shrink-0 mt-0.5 shadow-xs',
                          config.iconBg
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Title & Tag */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground truncate">
                            {item.title || 'Alerte Système'}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider whitespace-nowrap',
                              config.badgeBg
                            )}
                          >
                            {config.label}
                          </span>
                        </div>

                        {/* Client & Amount summary */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          {item.clientName && (
                            <p className="truncate font-semibold text-foreground/90">
                              Client : <span className="text-primary">{item.clientName}</span>
                            </p>
                          )}
                          {item.amount != null && item.amount > 0 && (
                            <span className="text-[11px] font-bold font-mono text-foreground whitespace-nowrap ml-2">
                              {item.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                            </span>
                          )}
                        </div>

                        {/* Message body */}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.message}
                        </p>

                        {/* Footer details & Action buttons */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Action button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleItemAction(item, e)}
                              className="h-7 text-[11px] px-2.5 rounded-lg font-semibold bg-background/80 hover:bg-background border-border flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <ActionIcon className="w-3 h-3 text-primary" />
                              <span>{config.actionLabel}</span>
                            </Button>

                            {/* Mark as read button */}
                            {!item.isRead && (
                              <button
                                onClick={(e) => handleMarkAsRead(item.id, e)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex-shrink-0 cursor-pointer"
                                title="Marquer comme lu"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
