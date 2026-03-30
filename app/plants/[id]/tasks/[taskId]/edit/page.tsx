'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { careTaskRepository, notificationScheduler } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function EditTaskPage({ params }: { params: { id: string; taskId: string } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskType: 'water' as 'water' | 'fertilize' | 'prune' | 'repot' | 'other',
    dueDate: '',
    repeatInterval: '' as '' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom',
    repeatCustomDays: '',
  });

  useEffect(() => {
    const loadTask = async () => {
      try {
        const task = await careTaskRepository.getById(params.taskId);
        if (!task) {
          router.push(`/plants/${params.id}`);
          return;
        }
        setFormData({
          title: task.title,
          description: task.description || '',
          taskType: task.taskType,
          dueDate: task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : '',
          repeatInterval: task.repeatInterval || '',
          repeatCustomDays: task.repeatCustomDays ? String(task.repeatCustomDays) : '',
        });
      } catch (error) {
        console.error('Failed to load task:', error);
        router.push(`/plants/${params.id}`);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [params.taskId, params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const newDueAt = formData.dueDate ? new Date(formData.dueDate) : undefined;

      // Cancel existing notification before rescheduling
      notificationScheduler.cancelForTask(params.taskId);

      const updated = await careTaskRepository.update({
        id: params.taskId,
        title: formData.title,
        description: formData.description || undefined,
        taskType: formData.taskType,
        dueAt: newDueAt,
        repeatInterval: formData.repeatInterval || null,
        repeatCustomDays:
          formData.repeatInterval === 'custom' && formData.repeatCustomDays
            ? parseInt(formData.repeatCustomDays, 10)
            : null,
      });

      // Reschedule notification if due date is set
      if (updated?.dueAt) {
        await notificationScheduler.scheduleForTask(updated);
      }

      router.back();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Edit Task</h1>

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
                  repeatCustomDays: '',
                })
              }
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom interval</option>
            </select>
          </div>

          {formData.repeatInterval === 'custom' && (
            <div>
              <label htmlFor="repeatCustomDays" className="block text-sm font-semibold mb-3">
                Every how many days? *
              </label>
              <input
                id="repeatCustomDays"
                type="number"
                min="1"
                max="365"
                required
                value={formData.repeatCustomDays}
                onChange={(e) => setFormData({ ...formData, repeatCustomDays: e.target.value })}
                className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., 14"
              />
            </div>
          )}

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
