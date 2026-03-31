import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AiInlineRequest from '@/components/AiInlineRequest';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

const SeedPanel =
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () => import('@/components/dev/SeedPanel').then((mod) => ({ default: mod.SeedPanel })),
        { ssr: false },
      )
    : null;

const ServiceWorkerRegister = dynamic(() => import('@/components/ServiceWorkerRegister'), {
  ssr: false,
});

const DatabaseInitializer = dynamic(() => import('@/components/DatabaseInitializer'), {
  ssr: false,
});

const ThemeToggle = dynamic(
  () => import('@/components/ThemeToggle').then((mod) => ({ default: mod.ThemeToggle })),
  {
    ssr: false,
  }
);

const OfflineIndicator = dynamic(
  () => import('@/components/OfflineIndicator').then((mod) => ({ default: mod.OfflineIndicator })),
  {
    ssr: false,
  }
);

const ErrorBoundary = dynamic(
  () => import('@/components/ErrorBoundary').then((mod) => ({ default: mod.ErrorBoundary })),
  {
    ssr: false,
  }
);

const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), { ssr: false });

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  variable: '--font-inter',
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: 'Fueille - Care for Your Plants',
  description: 'Track your plants and care tasks with offline-first app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fueille',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2D5A27',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Only show inline AI editor when explicitly enabled
  const showInlineAI = process.env.NEXT_PUBLIC_INLINE_AI === '1';

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Inline script runs synchronously before CSS paint to prevent dark mode flash */}
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch(e) {}
})();
` }} />
      </head>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <ErrorBoundary>
          <header className="sticky top-0 z-40 border-b border-border/20 bg-background/80 backdrop-blur-lg">
            <div className="container mx-auto px-6 py-3 flex items-center justify-between max-w-7xl">
              <Link
                href="/"
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Fueille Logo" className="h-8 w-8 logo-light-green" />
                <h1 className="text-xl font-semibold italic text-primary">
                  Fueille
                </h1>
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <OfflineIndicator />
          <div className="flex-1 pb-20">{children}</div>
          <Footer />
          <BottomNav />
          {showInlineAI && <AiInlineRequest />}
          {/* Service worker registration for PWA + mobile wrapper bridge hookup */}
          <ServiceWorkerRegister />
          {/* Initialize IndexedDB for offline-first data */}
          <DatabaseInitializer />
          {/* Dev-only seed panel for mock data management */}
          {SeedPanel && <SeedPanel />}
          {/* PWA install prompt */}
          <InstallPrompt />
        </ErrorBoundary>
      </body>
    </html>
  );
}
