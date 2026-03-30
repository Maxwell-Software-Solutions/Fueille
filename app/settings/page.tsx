'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDatabase, notificationScheduler } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CHANGELOG } from '@/lib/changelog';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';

type ThemeSetting = 'system' | 'light' | 'dark';

export default function SettingsPage() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>('system');

  useEffect(() => {
    const enabled = localStorage.getItem('notifications_enabled');
    setNotificationsEnabled(enabled !== 'false');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setThemeSetting(stored);
    } else {
      setThemeSetting('system');
    }
  }, []);

  const handleThemeChange = (value: ThemeSetting) => {
    setThemeSetting(value);
    if (value === 'system') {
      localStorage.removeItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      localStorage.setItem('theme', value);
      document.documentElement.classList.toggle('dark', value === 'dark');
    }
  };

  const handleNotificationsToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('notifications_enabled', String(newValue));
  };

  const handleRequestPermission = async () => {
    const granted = await notificationScheduler.requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const handleRescheduleAll = async () => {
    const count = await notificationScheduler.scheduleAllUpcoming();
    alert(`Scheduled ${count} notification(s).`);
  };

  const handleExport = async () => {
    const db = getDatabase();
    const [plants, careTasks, photos, tags, plantTags, layouts, plantMarkers] = await Promise.all([
      db.plants.toArray(),
      db.careTasks.toArray(),
      db.photos.toArray(),
      db.tags.toArray(),
      db.plantTags.toArray(),
      db.layouts.toArray(),
      db.plantMarkers.toArray(),
    ]);
    const json = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), plants, careTasks, photos, tags, plantTags, layouts, plantMarkers },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fueille-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.plants || !Array.isArray(data.plants)) {
        throw new Error('Invalid backup file: missing plants array');
      }

      // JSON.parse produces strings for Date fields — rehydrate them back to Date objects
      // so IndexedDB stores proper Dates that the repositories expect.
      const toDate = (v: unknown) => (v ? new Date(v as string) : null);
      const rehydrateDates = (fields: string[], items: unknown[]): unknown[] =>
        items.map((item) => {
          const copy = { ...(item as Record<string, unknown>) };
          for (const f of fields) {
            if (f in copy) copy[f] = toDate(copy[f]);
          }
          return copy;
        });

      const common = ['createdAt', 'updatedAt', 'deletedAt'];
      // Cast needed: bulkPut requires the concrete entity type but rehydrated data is unknown[]
      const r = (fields: string[], src: unknown[]) => rehydrateDates(fields, src) as never[];

      const db = getDatabase();
      await Promise.all([
        data.plants?.length && db.plants.bulkPut(r([...common], data.plants)),
        data.careTasks?.length && db.careTasks.bulkPut(r([...common, 'dueAt', 'completedAt', 'snoozedUntil'], data.careTasks)),
        data.photos?.length && db.photos.bulkPut(r([...common, 'takenAt', 'uploadedAt'], data.photos)),
        data.tags?.length && db.tags.bulkPut(r([...common], data.tags)),
        data.plantTags?.length && db.plantTags.bulkPut(r([...common], data.plantTags)),
        data.layouts?.length && db.layouts.bulkPut(r([...common], data.layouts)),
        data.plantMarkers?.length && db.plantMarkers.bulkPut(r([...common], data.plantMarkers)),
      ].filter(Boolean));
      setImportStatus('success');
      setImportMessage(`Imported successfully!`);
    } catch (err) {
      setImportStatus('error');
      setImportMessage(err instanceof Error ? err.message : 'Import failed');
    }
    // Reset input
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (!confirm('This will permanently delete ALL your plants, tasks, photos, and tags. This cannot be undone. Are you sure?')) return;
    const db = getDatabase();
    await Promise.all([
      db.plants.clear(),
      db.careTasks.clear(),
      db.photos.clear(),
      db.tags.clear(),
      db.plantTags.clear(),
      db.layouts.clear(),
      db.plantMarkers.clear(),
    ]);
    router.push('/');
  };

  const handleCheckForUpdates = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      alert('Update check sent. Reload the page to apply any updates.');
    } else {
      alert('No service worker active or app is already up to date.');
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Notifications */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable notifications</p>
              <p className="text-sm text-muted-foreground">Receive care reminders for your plants</p>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-primary' : 'bg-muted'
              }`}
              aria-checked={notificationsEnabled}
              role="switch"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Permission status</p>
              <p className="text-sm text-muted-foreground capitalize">{permissionStatus}</p>
            </div>
            {permissionStatus !== 'granted' && (
              <Button variant="outline" size="sm" onClick={handleRequestPermission}>
                Request Permission
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reschedule all</p>
              <p className="text-sm text-muted-foreground">Re-schedule notifications for upcoming tasks</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRescheduleAll}>
              Reschedule All
            </Button>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-muted-foreground">Choose light, dark, or follow the system</p>
          </div>
          <select
            value={themeSetting}
            onChange={(e) => handleThemeChange(e.target.value as ThemeSetting)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Data Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export data</p>
              <p className="text-sm text-muted-foreground">Download a backup of all your data</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export JSON
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Import data</p>
              <p className="text-sm text-muted-foreground">Restore from a backup file</p>
              {importStatus !== 'idle' && (
                <p className={`text-sm mt-1 ${importStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {importMessage}
                </p>
              )}
            </div>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>Import JSON</span>
              </Button>
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Clear all data</p>
              <p className="text-sm text-muted-foreground">Permanently delete everything</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">App</p>
            <p className="text-sm font-medium">Fueille</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Version</p>
            <p className="text-sm font-medium">{APP_VERSION}</p>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={handleCheckForUpdates}>
              Check for Updates
            </Button>
          </div>
        </div>
      </Card>

      {/* What's New */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">What&apos;s New</h2>
        {(() => {
          const currentEntry = CHANGELOG.find((e) => e.version === APP_VERSION) ?? CHANGELOG[0];
          const entriesToShow = showAllVersions ? CHANGELOG : (currentEntry ? [currentEntry] : []);
          return (
            <div className="space-y-6">
              {entriesToShow.map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-semibold text-sm">v{entry.version}</span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="shrink-0">&#x2022;</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {CHANGELOG.length > 1 && (
                <button
                  onClick={() => setShowAllVersions((v) => !v)}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {showAllVersions ? 'Show current version only' : 'See all versions'}
                </button>
              )}
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
