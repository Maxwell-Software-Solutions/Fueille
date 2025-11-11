'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { careTaskRepository, notificationScheduler } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NewTaskPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: 'water' as 'water' | 'fertilize' | 'prune' | 'repot' | 'other',
    dueDate: '',
    repeatInterval: '' as '' | 'daily' | 'weekly' | 'biweekly' | 'monthly',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const task = await careTaskRepository.create({
        plantId: params.id,
        title: formData.title,
        description: formData.description || undefined,
        taskType: formData.taskType,
        dueAt: formData.dueDate ? new Date(formData.dueDate) : undefined,
        repeatInterval: formData.repeatInterval || null,
      });

      // Schedule notification if due date set and permission granted
      if (task.dueAt) {
        await notificationScheduler.scheduleForTask(task);
      }

      router.back();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Add Care Task</h1>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold mb-3">
              Task Name *
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Water plant"
            />
          </div>

          <div>
            <label htmlFor="taskType" className="block text-sm font-semibold mb-3">
              Task Type
            </label>
            <select
              id="taskType"
              value={formData.taskType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  taskType: e.target.value as typeof formData.taskType,
                })
              }
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="water">💧 Water</option>
              <option value="fertilize">🌿 Fertilize</option>
              <option value="prune">✂️ Prune</option>
              <option value="repot">🪴 Repot</option>
              <option value="other">📝 Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-semibold mb-3">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="repeatInterval" className="block text-sm font-semibold mb-3">
              Repeat
            </label>
            <select
              id="repeatInterval"
              value={formData.repeatInterval}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  repeatInterval: e.target.value as typeof formData.repeatInterval,
                })
              }
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold mb-3">
              Notes
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={4}
              placeholder="Additional details..."
            />
          </div>

          <div className="flex gap-4 pt-6">
            <Button type="submit" disabled={saving || !formData.title.trim()} size="lg">
              {saving ? 'Saving...' : 'Save Task'}
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
