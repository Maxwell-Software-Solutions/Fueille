'use client';

import { useEffect, useState } from 'react';
import { notificationScheduler } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Component to request notification permission and initialize scheduler
 * Shows permission prompt with explanation
 */
export function NotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPermission(notificationScheduler.getPermission());

    // Detect if running on mobile (Capacitor)
    if (typeof window !== 'undefined' && window.Capacitor) {
      setIsMobile(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      const granted = await notificationScheduler.requestPermission();
      setPermission(notificationScheduler.getPermission());

      if (granted) {
        // Schedule all upcoming task notifications
        const count = await notificationScheduler.scheduleAllUpcoming();
        console.log(`Scheduled ${count} notifications`);

        // Show success message on mobile
        if (typeof window !== 'undefined' && window.Capacitor) {
          // On mobile, show a toast or alert (can be enhanced with Toast plugin)
          console.log('✅ Notifications enabled! You will receive plant care reminders.');
        }
      } else {
        console.warn('Notification permission was not granted');
        // On mobile, might need to guide user to settings
        if (typeof window !== 'undefined' && window.Capacitor) {
          console.log('⚠️ Please enable notifications in your device settings');
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Don't render until mounted (prevent hydration mismatch)
  if (!mounted) {
    return null;
  }

  // Don't show if already granted
  if (permission === 'granted') {
    return null;
  }

  // Don't show if denied (user must enable in browser settings)
  if (permission === 'denied') {
    return null;
  }

  return (
    <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">🔔 Enable Reminders</h3>
          <p className="text-sm text-muted-foreground">
            {isMobile
              ? "Get notified when your plants need care. We'll send push notifications to your device for due tasks."
              : "Get notified when your plants need care. We'll send browser notifications for due tasks."}
          </p>
        </div>
        <Button onClick={handleRequestPermission} size="default">
          Enable
        </Button>
      </div>
    </Card>
  );
}
