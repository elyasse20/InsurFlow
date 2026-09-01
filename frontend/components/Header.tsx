'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import NotificationDropdown from '@/components/NotificationDropdown';
import ClaimsAnalyzerModal from '@/components/ai/ClaimsAnalyzerModal';
import { useAuth } from '@/context/AuthContext';

import { Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onToggleMobileNav?: () => void;
}

export default function Header({ onToggleMobileNav }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/operations?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="h-16 flex-shrink-0 z-30 border-b border-border bg-white/90 dark:bg-card/90 backdrop-blur-md px-3.5 sm:px-6 flex items-center justify-between w-full min-w-0 transition-colors">
      {/* Left: Mobile Menu Hamburger & Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-md">
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

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une police, client..."
            className="pl-9 pr-3 bg-muted/40 border-border h-9 text-xs focus:bg-background transition-colors w-full"
          />
        </form>
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
