'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Clock, Check, CheckCheck, RefreshCw, X, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export interface NotificationItem {
  id: string;
  policyNumber: string;
  clientName: string;
  expirationDate: string;
  message: string;
  type: 'RENEWAL_30_DAYS' | 'RENEWAL_15_DAYS';
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count & notifications
  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get<{ count: number; unreadCount: number }>('/notifications/count'),
        api.get<NotificationItem[]>('/notifications?unreadOnly=true'),
      ]);
      setUnreadCount(countRes.data.unreadCount ?? countRes.data.count ?? 0);
      setNotifications(listRes.data || []);
    } catch {
      // Ignore errors silently for background polling
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
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Manual trigger scan (for testing/demoing)
  const handleTriggerCheck = async () => {
    setLoading(true);
    try {
      await api.post('/notifications/trigger-check');
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to trigger notification check:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none',
          isOpen
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        title="Alertes & Notifications"
        aria-label="Alertes & Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-md shadow-red-500/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-auto sm:mt-3 w-auto sm:w-96 max-w-full rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Échéances & Renouvellements</h3>
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} alerte(s) non lue(s)` : 'Aucune alerte en attente'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleTriggerCheck}
                disabled={loading}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Scanner les échéances (Scan)"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-primary')} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/10 text-xs">
              <span className="text-muted-foreground font-medium">Polices arrivant à terme</span>
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout marquer comme lu
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center px-4 space-y-2">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-foreground">Tout est à jour !</p>
                <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                  Aucune police d'assurance n'arrive à échéance dans les 30 prochains jours.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUrgent = item.type === 'RENEWAL_15_DAYS';
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 transition-colors hover:bg-muted/50 flex items-start gap-3 relative group',
                      isUrgent ? 'bg-red-500/5' : 'bg-amber-500/5'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'p-2 rounded-xl flex-shrink-0 mt-0.5',
                        isUrgent
                          ? 'bg-red-500/15 text-red-500'
                          : 'bg-amber-500/15 text-amber-500'
                      )}
                    >
                      {isUrgent ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          Police N° {item.policyNumber}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                            isUrgent
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          )}
                        >
                          {isUrgent ? '15 Jours' : '30 Jours'}
                        </span>
                      </div>

                      <p className="text-xs text-foreground font-medium truncate">
                        Client : <span className="text-primary">{item.clientName}</span>
                      </p>

                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      <p className="text-[10px] text-muted-foreground/70 font-mono">
                        Échéance : {item.expirationDate}
                      </p>
                    </div>

                    {/* Mark as read button */}
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors flex-shrink-0 opacity-80 group-hover:opacity-100"
                      title="Marquer comme lu"
                    >
                      <Check className="w-4 h-4" />
                    </button>
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
