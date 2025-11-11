import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AiInlineRequest from '@/components/AiInlineRequest';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';

const ServiceWorkerRegister = dynamic(() => import('@/components/ServiceWorkerRegister'), {
  ssr: false,
});

const DatabaseInitializer = dynamic(() => import('@/components/DatabaseInitializer'), {
  ssr: false,
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  variable: '--font-inter',
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: 'Plant Tracker - Care for Your Plants',
  description: 'Track your plants and care tasks with offline-first app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Plant Tracker',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Only show inline AI editor when explicitly enabled
  const showInlineAI = process.env.NEXT_PUBLIC_INLINE_AI === '1';

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <div className="flex-1">{children}</div>
        <Footer />
        {showInlineAI && <AiInlineRequest />}
        {/* Service worker registration for PWA + mobile wrapper bridge hookup */}
        <ServiceWorkerRegister />
        {/* Initialize IndexedDB for offline-first data */}
        <DatabaseInitializer />
      </body>
    </html>
  );
}
