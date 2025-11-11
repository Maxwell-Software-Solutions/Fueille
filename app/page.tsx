'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { careTaskRepository, plantRepository, type CareTask, type Plant } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Home() {
  const [dueTasks, setDueTasks] = useState<Array<CareTask & { plant?: Plant }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
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
      await loadTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
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
    <main className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🌱 Plant Tracker</h1>
        <p className="text-muted-foreground">Keep your plants healthy and thriving</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link href="/plants">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🌿</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">My Plants</h2>
                <p className="text-sm text-muted-foreground">View and manage your plants</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/plants/new">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">➕</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Add Plant</h2>
                <p className="text-sm text-muted-foreground">Track a new plant</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <div className="mb-4">
        <h2 className="text-2xl font-bold">Today&apos;s Tasks</h2>
        <p className="text-sm text-muted-foreground">Care tasks that are due now or overdue</p>
      </div>

      {dueTasks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-lg mb-2">✨ All caught up!</p>
          <p className="text-muted-foreground">No tasks due today</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {dueTasks.map((task) => {
            const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();

            return (
              <Card key={task.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🌱</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{task.title}</h3>
                        <span className="text-xs px-2 py-1 bg-muted rounded">{task.taskType}</span>
                        {isOverdue && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                      {task.plant && (
                        <Link href={`/plants/${task.plant.id}`}>
                          <p className="text-sm text-muted-foreground hover:underline">
                            {task.plant.name}
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
                  <Button size="sm" onClick={() => handleComplete(task.id)}>
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
