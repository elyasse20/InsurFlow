'use client';

import React from 'react';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Welcome & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher une police, client, contrat..."
            className="pl-9 bg-muted/40 border-border h-9 text-xs focus:bg-background transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
          <div className="text-right text-xs">
            <p className="font-semibold text-foreground leading-tight">{user?.username}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
