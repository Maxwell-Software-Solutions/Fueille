'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PhotoCaptureProps {
  onPhotoCapture: (dataUrl: string) => void;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Photo capture component with camera and file picker support
 * Compresses images to reduce storage size
 */
export function PhotoCapture({
  onPhotoCapture,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.85,
}: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Calculate new dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with quality compression
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
      onPhotoCapture(compressed);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraClick = () => {
    // Try native bridge first
    if (window.NativePlantBridge?.takePhoto) {
      window.NativePlantBridge.takePhoto()
        .then((result) => {
          if (result.uri && !result.canceled) {
            setPreview(result.uri);
            onPhotoCapture(result.uri);
          } else {
            // Fall back to HTML5 input if canceled
            cameraInputRef.current?.click();
          }
        })
        .catch((error: Error) => {
          console.error('Native camera error:', error);
          // Fall back to HTML5 input
          cameraInputRef.current?.click();
        });
    } else {
      // Use HTML5 camera input
      cameraInputRef.current?.click();
    }
  };

  const handleFilePickerClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Camera input"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="File picker input"
      />

      {/* Preview or capture buttons */}
      {preview ? (
        <Card className="p-4">
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Photo preview" className="w-full h-auto rounded-lg" />
            <Button type="button" variant="outline" onClick={handleClear} className="w-full">
              Clear Photo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={handleCameraClick}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : '📷 Take Photo'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleFilePickerClick}
            disabled={isProcessing}
            className="flex-1"
          >
            📁 Choose File
          </Button>
        </div>
      )}
    </div>
  );
}
