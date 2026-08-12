import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'InsurFlow',
  description: 'Système de gestion des assurances',
};

// Script exécuté AVANT le premier paint pour éviter le flash de mauvais thème (FOUC).
// Lit localStorage et applique la classe .dark sur <html> immédiatement.
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('insurflow-theme');
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Anti-flash: applique le thème avant le premier rendu */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


