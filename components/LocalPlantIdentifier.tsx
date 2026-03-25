'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface IdentificationResult {
  label: string;
  score: number;
}

interface LocalPlantIdentifierProps {
  /** Pre-fill with an existing image URL (e.g. plant thumbnail) */
  imageUrl?: string;
  /** Called when the user picks a result to use */
  onResult?: (label: string) => void;
  /** Compact mode for embedding in forms */
  compact?: boolean;
}

export function LocalPlantIdentifier({
  imageUrl,
  onResult,
  compact = false,
}: LocalPlantIdentifierProps) {
  const [status, setStatus] = useState<'idle' | 'loading-model' | 'identifying' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressFile, setProgressFile] = useState('');
  const [results, setResults] = useState<IdentificationResult[]>([]);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageSourceRef = useRef<string | File | null>(imageUrl ?? null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    imageSourceRef.current = file;
    setPreviewUrl(URL.createObjectURL(file));
    setResults([]);
    setStatus('idle');
  }, []);

  const handleIdentify = useCallback(async () => {
    const source = imageSourceRef.current;
    if (!source) return;

    setError('');
    setResults([]);
    setStatus('loading-model');
    setProgress(0);

    try {
      const { identifyPlant } = await import('@/lib/ai/localPlantIdentifier');

      const predictions = await identifyPlant(source, 5, (p) => {
        if (p.status === 'progress' && p.progress != null) {
          setProgress(Math.round(p.progress));
          if (p.file) {
            const shortName = p.file.split('/').pop() ?? p.file;
            setProgressFile(shortName);
          }
        }
        if (p.status === 'ready') {
          setStatus('identifying');
        }
      });

      setResults(predictions);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identification failed');
      setStatus('error');
    }
  }, []);

  const statusText =
    status === 'loading-model'
      ? `Downloading AI model... ${progress}%`
      : status === 'identifying'
        ? 'Analyzing image...'
        : null;

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {/* Image selection */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? 'Change Photo' : 'Take / Select Photo'}
        </Button>
        <Button
          size={compact ? 'sm' : 'default'}
          onClick={handleIdentify}
          disabled={!imageSourceRef.current || status === 'loading-model' || status === 'identifying'}
        >
          {status === 'loading-model' || status === 'identifying' ? 'Identifying...' : 'Identify Plant'}
        </Button>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Plant to identify"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Progress */}
      {statusText && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{statusText}</p>
          {status === 'loading-model' && (
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {progressFile && status === 'loading-model' && (
            <p className="text-xs text-muted-foreground truncate">{progressFile}</p>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Predictions (local AI)</p>
          <ul className="space-y-1.5">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <button
                  onClick={() => onResult?.(r.label)}
                  className="flex-1 flex items-center gap-2 text-left p-1.5 -m-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={`Use "${r.label}"`}
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium">{r.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(r.score * 100).toFixed(1)}%
                  </span>
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${r.score * 100}%` }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2">Tap a result to use it</p>
        </Card>
      )}
    </div>
  );
}
