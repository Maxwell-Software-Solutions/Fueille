'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  plantRepository,
  careTaskRepository,
  photoRepository,
  type Plant,
  type CareTask,
  type Photo,
} from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhotoCapture } from '@/components/PhotoCapture';

export default function PlantDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  const loadPlantData = useCallback(async () => {
    try {
      const plantData = await plantRepository.getById(params.id);
      if (!plantData) {
        router.push('/plants');
        return;
      }
      setPlant(plantData);

      const plantTasks = await careTaskRepository.list({ plantId: params.id });
      setTasks(plantTasks);

      const plantPhotos = await photoRepository.list({ plantId: params.id });
      setPhotos(plantPhotos);
    } catch (error) {
      console.error('Failed to load plant:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadPlantData();
  }, [loadPlantData]);

  const handleDelete = async () => {
    if (!confirm('Delete this plant? This cannot be undone.')) return;

    try {
      await plantRepository.delete(params.id);
      router.push('/plants');
    } catch (error) {
      console.error('Failed to delete plant:', error);
      alert('Failed to delete plant');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await careTaskRepository.complete(taskId);
      await loadPlantData();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handlePhotoCapture = async (dataUrl: string) => {
    try {
      await photoRepository.create({
        plantId: params.id,
        localUri: dataUrl,
        takenAt: new Date(),
      });
      setShowPhotoCapture(false);
      await loadPlantData();
    } catch (error) {
      console.error('Failed to save photo:', error);
      alert('Failed to save photo');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;

    try {
      await photoRepository.delete(photoId);
      await loadPlantData();
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Failed to delete photo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!plant) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      <Card className="p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-4xl">🌱</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{plant.name}</h1>
              {plant.species && <p className="text-muted-foreground">{plant.species}</p>}
              {plant.location && (
                <p className="text-sm text-muted-foreground mt-1">📍 {plant.location}</p>
              )}
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>

        {plant.notes && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{plant.notes}</p>
          </div>
        )}
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Care Tasks</h2>
        <Button onClick={() => router.push(`/plants/${plant.id}/tasks/new`)}>+ Add Task</Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 text-center mb-8">
          <p className="text-muted-foreground mb-4">No care tasks yet</p>
          <Button onClick={() => router.push(`/plants/${plant.id}/tasks/new`)}>
            Add First Task
          </Button>
        </Card>
      ) : (
        <div className="space-y-3 mb-8">
          {tasks.map((task) => {
            const isOverdue = task.dueAt && !task.completedAt && new Date(task.dueAt) < new Date();
            const isDue =
              task.dueAt &&
              !task.completedAt &&
              new Date(task.dueAt) <= new Date(Date.now() + 86400000);

            return (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{task.title}</h3>
                      <span className="text-xs px-2 py-1 bg-muted rounded">{task.taskType}</span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                          Overdue
                        </span>
                      )}
                      {isDue && !isOverdue && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                          Due Soon
                        </span>
                      )}
                      {task.completedAt && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          ✓ Done
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    {task.dueAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Due: {new Date(task.dueAt).toLocaleDateString()}
                      </p>
                    )}
                    {task.repeatInterval && (
                      <p className="text-xs text-muted-foreground">
                        Repeats: {task.repeatInterval}
                      </p>
                    )}
                  </div>
                  {!task.completedAt && (
                    <Button size="sm" onClick={() => handleCompleteTask(task.id)}>
                      Complete
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Photos</h2>
        <Button onClick={() => setShowPhotoCapture(!showPhotoCapture)}>
          {showPhotoCapture ? 'Cancel' : '+ Add Photo'}
        </Button>
      </div>

      {showPhotoCapture && (
        <Card className="p-4 mb-4">
          <PhotoCapture onPhotoCapture={handlePhotoCapture} />
        </Card>
      )}

      {photos.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No photos yet</p>
          <Button onClick={() => setShowPhotoCapture(true)}>Add First Photo</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.localUri || photo.remoteUrl || ''}
                alt="Plant photo"
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="destructive" onClick={() => handleDeletePhoto(photo.id)}>
                  Delete
                </Button>
              </div>
              <div className="p-2 text-xs text-muted-foreground">
                {new Date(photo.takenAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
