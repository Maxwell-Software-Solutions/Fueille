'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  careTaskRepository,
  plantRepository,
  notificationScheduler,
  type CareTask,
  type Plant,
} from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NotificationSetup } from '@/components/NotificationSetup';

export default function Home() {
  const [dueTasks, setDueTasks] = useState<Array<CareTask & { plant?: Plant }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();

    // Schedule notifications for upcoming tasks on mount
    const initNotifications = async () => {
      if (notificationScheduler.getPermission() === 'granted') {
        await notificationScheduler.scheduleAllUpcoming();
      }
    };
    initNotifications();
  }, []);

  const loadTasks = async () => {
    try {
      const tasks = await careTaskRepository.list({ isDue: true });

      // Load plant info for each task
      const tasksWithPlants = await Promise.all(
        tasks.map(async (task) => {
          const plant = await plantRepository.getById(task.plantId);
          return { ...task, plant };
        })
      );

      setDueTasks(tasksWithPlants);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await careTaskRepository.complete(taskId);

      // Cancel notification for completed task
      notificationScheduler.cancelForTask(taskId);

      await loadTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-6 py-8 max-w-7xl" suppressHydrationWarning>
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">Welcome to Fueille</h1>
        <p className="text-base text-muted-foreground">Keep your plants healthy and thriving</p>
      </div>

      <NotificationSetup />

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <Link href="/plants">
          <Card className="p-6 neu-interactive cursor-pointer hover:neu-floating">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 neu-pressed rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🌿</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">My Plants</h2>
                <p className="text-sm text-muted-foreground">View and manage your plants</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/plants/new">
          <Card className="p-6 neu-interactive cursor-pointer hover:neu-floating">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 neu-pressed rounded-2xl flex items-center justify-center">
                <span className="text-3xl">➕</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">Add Plant</h2>
                <p className="text-sm text-muted-foreground">Track a new plant</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Today&apos;s Tasks</h2>
        <p className="text-base text-muted-foreground">Care tasks that are due now or overdue</p>
      </div>

      {dueTasks.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-xl font-semibold mb-2">✨ All caught up!</p>
          <p className="text-base text-muted-foreground">No tasks due today</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {dueTasks.map((task) => {
            const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();

            return (
              <Card key={task.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 neu-pressed rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🌱</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-base">{task.title}</h3>
                        <span className="text-xs px-3 py-1 neu-pressed rounded-lg font-medium">
                          {task.taskType}
                        </span>
                        {isOverdue && (
                          <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      {task.plant && (
                        <Link href={`/plants/${task.plant.id}`}>
                          <p className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            🪴 {task.plant.name}
                          </p>
                        </Link>
                      )}
                      {task.dueAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {new Date(task.dueAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="default" onClick={() => handleComplete(task.id)}>
                    Complete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
