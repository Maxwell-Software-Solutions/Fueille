'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { layoutRepository } from '@/lib/domain';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NewLayoutPage() {
  const router = useRouter();
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'outdoor' as 'indoor' | 'outdoor',
    imageUri: '',
    imageWidth: 0,
    imageHeight: 0,
  });

  const handlePhotoCapture = async (dataUrl: string) => {
    // Get image dimensions
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    setFormData({
      ...formData,
      imageUri: dataUrl,
      imageWidth: img.width,
      imageHeight: img.height,
    });
    setShowPhotoCapture(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.imageUri) return;

    try {
      const layout = await layoutRepository.create(formData);
      router.push(`/layouts/${layout.id}`);
    } catch (error) {
      console.error('Failed to create layout:', error);
      alert('Failed to create layout');
    }
  };

  if (showPhotoCapture) {
    return <PhotoCapture onPhotoCapture={handlePhotoCapture} />;
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create Layout</h1>

      <Card className="p-8">
        {!formData.imageUri ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              First, take or upload a photo of your garden or room
            </p>
            <Button onClick={() => setShowPhotoCapture(true)} className="w-full">
              Take Photo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preview */}
            <div className="relative">
              <img
                src={formData.imageUri}
                alt="Layout preview"
                className="w-full h-auto rounded-lg"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Layout Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Backyard Garden, Living Room"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes about this space"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                rows={3}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'indoor' | 'outdoor' })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <option value="outdoor">Outdoor (Garden, Patio)</option>
                <option value="indoor">Indoor (Room, Greenhouse)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Create Layout
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
