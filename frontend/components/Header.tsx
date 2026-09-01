'use client';

import React from 'react';
import NotificationDropdown from '@/components/NotificationDropdown';
import ClaimsAnalyzerModal from '@/components/ai/ClaimsAnalyzerModal';
import OmniSearch from '@/components/OmniSearch';
import { useAuth } from '@/context/AuthContext';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onToggleMobileNav?: () => void;
}

export default function Header({ onToggleMobileNav }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 flex-shrink-0 z-30 border-b border-border bg-white/90 dark:bg-card/90 backdrop-blur-md px-3.5 sm:px-6 flex items-center justify-between w-full min-w-0 transition-colors">
      {/* Left: Mobile Menu Hamburger & OmniSearch Live Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-lg">
        {/* Mobile Hamburger Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMobileNav}
          className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Global Omnisearch Live Search Bar */}
        <OmniSearch />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
        {/* Claims AI Analyzer Shortcut */}
        <ClaimsAnalyzerModal triggerButtonText="Sinistres IA" triggerButtonSize="sm" />

        {/* Notification Bell & Dropdown */}
        <NotificationDropdown />

        {/* User Badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
          <div className="text-right text-xs">
            <p className="font-semibold text-foreground leading-tight truncate max-w-[120px]">
              {user?.username || 'admin'}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {user?.role?.toLowerCase() || 'Admin'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
