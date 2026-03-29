'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDatabase, notificationScheduler } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SettingsPage() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    const enabled = localStorage.getItem('notifications_enabled');
    setNotificationsEnabled(enabled !== 'false');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

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
      const db = getDatabase();
      await Promise.all([
        data.plants?.length && db.plants.bulkPut(data.plants),
        data.careTasks?.length && db.careTasks.bulkPut(data.careTasks),
        data.photos?.length && db.photos.bulkPut(data.photos),
        data.tags?.length && db.tags.bulkPut(data.tags),
        data.plantTags?.length && db.plantTags.bulkPut(data.plantTags),
        data.layouts?.length && db.layouts.bulkPut(data.layouts),
        data.plantMarkers?.length && db.plantMarkers.bulkPut(data.plantMarkers),
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
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">App</p>
            <p className="text-sm font-medium">Fueille</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Version</p>
            <p className="text-sm font-medium">1.0.0</p>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={handleCheckForUpdates}>
              Check for Updates
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
