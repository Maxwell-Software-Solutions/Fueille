'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Leaf, Plus, BookOpen, Settings } from 'lucide-react';

const tabs = [
  { href: '/' as const, icon: Home, label: 'Home', isCenter: false },
  { href: '/plants' as const, icon: Leaf, label: 'Plants', isCenter: false },
  { href: '/plants/new' as const, icon: Plus, label: 'Add', isCenter: true },
  { href: '/plant-library' as const, icon: BookOpen, label: 'Library', isCenter: false },
  { href: '/settings' as const, icon: Settings, label: 'Settings', isCenter: false },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        {tabs.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="-mt-4 flex flex-col items-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform active:scale-95">
                  <Icon size={24} className="text-primary-foreground" />
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center px-3 py-2"
            >
              <Icon
                size={20}
                className={isActive ? 'text-primary' : 'text-muted-foreground'}
              />
              <span
                className={`mt-0.5 text-[10px] font-medium ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
