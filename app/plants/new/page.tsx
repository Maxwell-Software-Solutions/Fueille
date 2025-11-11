'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { plantRepository } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NewPlantPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    location: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await plantRepository.create({
        name: formData.name,
        species: formData.species || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      });
      router.push('/plants');
    } catch (error) {
      console.error('Failed to create plant:', error);
      alert('Failed to create plant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Add New Plant</h1>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold mb-3">
              Plant Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Snake Plant"
            />
          </div>

          <div>
            <label htmlFor="species" className="block text-sm font-semibold mb-3">
              Species
            </label>
            <input
              id="species"
              type="text"
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Sansevieria trifasciata"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-semibold mb-3">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Living Room"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold mb-3">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={5}
              placeholder="Care instructions, observations, etc."
            />
          </div>

          <div className="flex gap-4 pt-6">
            <Button type="submit" disabled={saving || !formData.name.trim()} size="lg">
              {saving ? 'Saving...' : 'Save Plant'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
