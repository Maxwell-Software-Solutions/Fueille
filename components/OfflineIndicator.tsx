'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

/**
 * Offline Indicator Component
 * Shows a banner when the user is offline
 * Automatically hides when connection is restored
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Initialize with current status
    setIsOnline(navigator.onLine);
    setShowBanner(!navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true); // Show "back online" message
      // Hide banner after 2 seconds
      setTimeout(() => setShowBanner(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner && isOnline) {
    return null;
  }

  return (
    <div className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <Card
        className={`px-6 py-3 shadow-lg pointer-events-auto transition-all duration-300 ${
          isOnline
            ? 'bg-green-500 text-white border-green-600'
            : 'bg-yellow-500 text-black border-yellow-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{isOnline ? '✓' : '⚠'}</span>
          <p className="text-sm font-semibold">
            {isOnline ? 'Back online' : 'You are offline - Changes will be saved locally'}
          </p>
        </div>
      </Card>
    </div>
  );
}
