'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import NavBar from '@/components/NavBar';
import Header from '@/components/Header';
import CopilotWidget from '@/components/ai/CopilotWidget';

/**
 * Dashboard layout — wraps all protected routes with responsive NavBar + Header + auth guard + AI Copilot.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full flex">
      {/* ── Left Sidebar Navigation (Desktop fixed + Mobile drawer) ── */}
      <NavBar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* ── Main Content Area with Persistent Sticky Header ─────────── */}
      <div className="flex-1 lg:ml-64 ml-0 min-h-screen flex flex-col min-w-0 w-full">
        {/* Sticky Header visible across all dashboard sub-routes */}
        <Header onToggleMobileNav={() => setMobileNavOpen(v => !v)} />

        {/* Page Content Container */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full space-y-6 sm:space-y-8 min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* ── Floating AI Copilot Assistant ──────────────────────────── */}
      <CopilotWidget />
    </div>
  );
}
