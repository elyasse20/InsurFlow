'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Users, Shield, List, Settings, LogOut,
  DollarSign, Tag, Percent, FileText,
  LayoutDashboard, ChevronRight, Sun, Moon, Database,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard, adminOnly: false },
      { href: '/clients',        label: 'Clients',       icon: Users,           adminOnly: false },
      { href: '/operations',     label: 'Opérations',    icon: FileText,        adminOnly: false },
      { href: '/compagnes',      label: 'Compagnes',     icon: Shield,          adminOnly: false },
      { href: '/credit-history', label: 'Crédits',       icon: DollarSign,      adminOnly: false },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/referentiels',   label: 'Référentiels',  icon: Database,        adminOnly: false },
      { href: '/users',          label: 'Utilisateurs',  icon: Users,           adminOnly: true  },
    ],
  },
];

export default function NavBar() {
  const pathname = usePathname();
  const { user, logout, isAdminUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col z-50 bg-card border-r border-border">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="h-16 flex items-center px-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Shield className="text-white w-4 h-4" />
          </div>
          <div>
            <span className="text-foreground font-bold text-base leading-none">InsurFlow</span>
            <p className="text-muted-foreground text-[10px] mt-0.5 font-medium uppercase tracking-wider">
              Gestion Pro
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(
            item => !item.adminOnly || isAdminUser
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi} className="space-y-1.5">
              <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
              {visibleItems.map(item => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                      active
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className={cn(
                      'w-4 h-4 flex-shrink-0 transition-transform duration-150',
                      active ? 'text-primary-foreground' : 'group-hover:scale-110'
                    )} />
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── User footer ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border">
        <Separator />
        <div className="p-5 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-semibold truncate">
                {user?.username}
              </p>
              <p className="text-muted-foreground text-xs truncate capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
              'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            aria-label="Basculer le thème"
          >
            <div className="relative w-4 h-4 flex-shrink-0">
              <Sun
                className={cn(
                  'absolute inset-0 w-4 h-4 transition-all duration-300',
                  isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                )}
              />
              <Moon
                className={cn(
                  'absolute inset-0 w-4 h-4 transition-all duration-300',
                  isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                )}
              />
            </div>
            <span className="flex-1 text-left">
              {isDark ? 'Mode clair' : 'Mode sombre'}
            </span>
            {/* Toggle pill */}
            <div className={cn(
              'relative w-9 h-5 rounded-full transition-colors duration-300',
              isDark ? 'bg-primary' : 'bg-muted-foreground/30'
            )}>
              <div className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300',
                isDark ? 'translate-x-[18px]' : 'translate-x-0.5'
              )} />
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
              'text-muted-foreground hover:text-red-400 hover:bg-red-500/10'
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}
