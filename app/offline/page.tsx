'use client';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
      <span className="text-6xl">🌿</span>
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-sm">
        Fueille works offline — your plants and tasks are stored on your device.
        Check your internet connection to sync and access new features.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
      >
        Try again
      </button>
    </div>
  );
}
