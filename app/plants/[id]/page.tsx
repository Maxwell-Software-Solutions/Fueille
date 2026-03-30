'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  plantRepository,
  careTaskRepository,
  photoRepository,
  tagRepository,
  type Plant,
  type CareTask,
  type Photo,
  type Tag,
} from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhotoCapture } from '@/components/PhotoCapture';
import { TagBadge } from '@/components/TagBadge';
import { TagPicker } from '@/components/TagPicker';
import { SnoozeMenu } from '@/components/SnoozeMenu';
import dynamic from 'next/dynamic';

const LocalPlantIdentifier = dynamic(
  () => import('@/components/LocalPlantIdentifier').then((m) => ({ default: m.LocalPlantIdentifier })),
  { ssr: false },
);

const TASK_TYPE_ICONS: Record<CareTask['taskType'], string> = {
  water: '💧',
  fertilize: '🌿',
  prune: '✂️',
  repot: '🪴',
  other: '📝',
};

function formatCompletedAt(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getMonthGroupKey(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function PlantDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CareTask[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantTags, setPlantTags] = useState<Tag[]>([]);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');
  const [editFormData, setEditFormData] = useState({
    name: '',
    species: '',
    location: '',
    notes: '',
  });

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

      const completedTaskList = await careTaskRepository.list({
        plantId: params.id,
        isCompleted: true,
      });
      // Sort by completedAt descending (most recent first)
      completedTaskList.sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
      });
      setCompletedTasks(completedTaskList);

      const plantPhotos = await photoRepository.list({ plantId: params.id });
      setPhotos(plantPhotos);

      const tagsData = await tagRepository.getTagsForPlant(params.id);
      setPlantTags(tagsData);
    } catch (error) {
      console.error('Failed to load plant:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadPlantData();
  }, [loadPlantData]);

  useEffect(() => {
    if (plant && isEditingDetails) {
      setEditFormData({
        name: plant.name,
        species: plant.species || '',
        location: plant.location || '',
        notes: plant.notes || '',
      });
      setEditTagIds(plantTags.map((t) => t.id));
    }
  }, [plant, isEditingDetails, plantTags]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      } else if (e.key === 'ArrowRight' && lightboxIndex < photos.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length]);

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
      const photo = await photoRepository.create({
        plantId: params.id,
        localUri: dataUrl,
        takenAt: new Date(),
      });

      // If this is the first photo, set it as the plant's thumbnail
      if (photos.length === 0 && plant) {
        await plantRepository.update({
          id: plant.id,
          thumbnailUrl: photo.localUri,
        });
      }

      setShowPhotoCapture(false);
      await loadPlantData();
    } catch (error) {
      console.error('Failed to save photo:', error);
      alert('Failed to save photo');
    }
  };

  const handleSetThumbnail = async (photoUri: string) => {
    if (!plant) return;

    try {
      await plantRepository.update({
        id: plant.id,
        thumbnailUrl: photoUri,
      });
      await loadPlantData();
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to update thumbnail:', error);
      alert('Failed to update plant image');
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

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plant || !editFormData.name.trim()) return;

    try {
      await plantRepository.update({
        id: plant.id,
        name: editFormData.name,
        species: editFormData.species || undefined,
        location: editFormData.location || undefined,
        notes: editFormData.notes || undefined,
      });
      await tagRepository.setTagsForPlant(plant.id, editTagIds);
      await loadPlantData();
      setIsEditingDetails(false);
    } catch (error) {
      console.error('Failed to update plant:', error);
      alert('Failed to update plant details');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingDetails(false);
    if (plant) {
      setEditFormData({
        name: plant.name,
        species: plant.species || '',
        location: plant.location || '',
        notes: plant.notes || '',
      });
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
      <Link href="/plants" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
        ← My Plants
      </Link>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          ← Back
        </Button>
        <div className="flex items-center gap-3">
          {isEditingDetails ? (
            <>
              <Button onClick={handleSaveDetails}>Save</Button>
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsEditingDetails(true)}
                title="Edit plant details"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </Button>
              <Button variant="secondary" size="icon" onClick={handleDelete} title="Delete plant">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div
              className={`w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${
                plant.thumbnailUrl && photos.length > 0
                  ? 'cursor-pointer hover:opacity-80 transition-opacity'
                  : 'bg-green-100'
              }`}
              onClick={() => {
                if (plant.thumbnailUrl && photos.length > 0) {
                  setIsEditMode(!isEditMode);
                }
              }}
              title={plant.thumbnailUrl && photos.length > 0 ? 'Click to change image' : undefined}
            >
              {plant.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={plant.thumbnailUrl}
                  alt={plant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">🌱</span>
              )}
            </div>

            {isEditingDetails ? (
              <form onSubmit={handleSaveDetails} className="flex-1 space-y-3">
                <div>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full text-xl font-bold px-3 py-1 neu-pressed rounded-lg bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Plant name"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={editFormData.species}
                    onChange={(e) => setEditFormData({ ...editFormData, species: e.target.value })}
                    className="w-full px-3 py-1 neu-pressed rounded-lg bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50 text-muted-foreground"
                    placeholder="Species (optional)"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full text-sm px-3 py-1 neu-pressed rounded-lg bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50 text-muted-foreground"
                    placeholder="📍 Location (optional)"
                  />
                </div>
              </form>
            ) : (
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold break-words" style={{ overflowWrap: 'anywhere' }}>
                  {plant.name}
                </h1>
                {plant.species && (
                  <p
                    className="text-muted-foreground break-words"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {plant.species}
                  </p>
                )}
                {plant.location && (
                  <p
                    className="text-sm text-muted-foreground mt-1 break-words"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    📍 {plant.location}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditingDetails ? (
          <>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">Notes</label>
              <textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={4}
                placeholder="Care instructions, observations, etc."
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-2">Tags</label>
              <TagPicker selectedTagIds={editTagIds} onChange={setEditTagIds} />
            </div>
          </>
        ) : (
          <>
            {plant.notes && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{plant.notes}</p>
              </div>
            )}
            {plantTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {plantTags.map((tag) => (
                  <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Tab bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 border-b w-full pb-0">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('history')}
          >
            History
            {completedTasks.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-muted rounded-full">
                {completedTasks.length}
              </span>
            )}
          </button>
          <div className="flex-1" />
          {activeTab === 'tasks' && (
            <Button data-testid="add-task-btn" onClick={() => router.push(`/plants/${plant.id}/tasks/new`)}>
              + Add Task
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'tasks' && (
        <>
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
                  <Card key={task.id} data-testid="task-card" className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3
                            className="font-semibold break-words"
                            style={{ overflowWrap: 'anywhere' }}
                          >
                            {task.title}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-muted rounded flex-shrink-0">
                            {task.taskType}
                          </span>
                          {isOverdue && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded flex-shrink-0">
                              Overdue
                            </span>
                          )}
                          {isDue && !isOverdue && (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded flex-shrink-0">
                              Due Soon
                            </span>
                          )}
                          {task.completedAt && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded flex-shrink-0">
                              ✓ Done
                            </span>
                          )}
                          {task.snoozedUntil && new Date(task.snoozedUntil) > new Date() && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded flex-shrink-0">
                              Snoozed until {new Date(task.snoozedUntil).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p
                            className="text-sm text-muted-foreground break-words"
                            style={{ overflowWrap: 'anywhere' }}
                          >
                            {task.description}
                          </p>
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          data-testid="task-edit-btn"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/plants/${params.id}/tasks/${task.id}/edit`)}
                        >
                          Edit
                        </Button>
                        {!task.completedAt && (
                          <>
                            <SnoozeMenu taskId={task.id} onSnoozed={loadPlantData} />
                            <Button
                              data-testid="task-complete-btn"
                              size="sm"
                              onClick={() => handleCompleteTask(task.id)}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tasks.length > 0 && (() => {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thisWeek = tasks.filter(
              (t) => t.completedAt && new Date(t.completedAt) >= weekAgo
            ).length;
            const thisMonth = tasks.filter((t) => {
              if (!t.completedAt) return false;
              const d = new Date(t.completedAt);
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length;
            const totalDone = tasks.filter((t) => t.completedAt != null).length;
            const pending = tasks.filter((t) => !t.completedAt && !t.deletedAt).length;

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'This week', value: thisWeek },
                  { label: 'This month', value: thisMonth },
                  { label: 'Total done', value: totalDone },
                  { label: 'Pending', value: pending },
                ].map(({ label, value }) => (
                  <Card key={label} className="p-4 text-center">
                    <p className="text-3xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{label}</p>
                  </Card>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {activeTab === 'history' && (
        <div className="mb-8">
          {completedTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No care history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete a task to start tracking care history.
              </p>
            </Card>
          ) : (
            (() => {
              // Group tasks by month key, preserving descending order
              const groups: { monthKey: string; tasks: CareTask[] }[] = [];
              const groupMap = new Map<string, CareTask[]>();
              for (const task of completedTasks) {
                const key = task.completedAt ? getMonthGroupKey(task.completedAt) : 'Unknown';
                if (!groupMap.has(key)) {
                  groupMap.set(key, []);
                  groups.push({ monthKey: key, tasks: groupMap.get(key)! });
                }
                groupMap.get(key)!.push(task);
              }

              return (
                <div className="space-y-6">
                  {groups.map(({ monthKey, tasks: monthTasks }) => (
                    <div key={monthKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {monthKey}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          — {monthTasks.length} {monthTasks.length === 1 ? 'task' : 'tasks'}
                        </span>
                      </div>
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        {monthTasks.map((task) => (
                          <Card key={task.id} className="p-4">
                            <div className="flex items-start gap-3">
                              <span className="text-xl flex-shrink-0" aria-hidden="true">
                                {TASK_TYPE_ICONS[task.taskType]}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h4
                                    className="font-medium break-words"
                                    style={{ overflowWrap: 'anywhere' }}
                                  >
                                    {task.title}
                                  </h4>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {task.completedAt ? formatCompletedAt(task.completedAt) : ''}
                                  </span>
                                </div>
                                {task.description && (
                                  <p
                                    className="text-sm text-muted-foreground mt-1 break-words"
                                    style={{ overflowWrap: 'anywhere' }}
                                  >
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Photos</h2>
        <div className="flex gap-2">
          {photos.length > 0 && (
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </Button>
          )}
          <Button onClick={() => setShowPhotoCapture(!showPhotoCapture)}>
            {showPhotoCapture ? 'Cancel' : '+ Add Photo'}
          </Button>
        </div>
      </div>

      {isEditMode && photos.length > 0 && (
        <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950">
          <p className="text-sm font-medium mb-2">Select a photo to set as plant image:</p>
        </Card>
      )}

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
          {photos.map((photo, i) => {
            const photoUri = photo.localUri || photo.remoteUrl || '';
            const isCurrentThumbnail = plant?.thumbnailUrl === photoUri;

            return (
              <Card
                key={photo.id}
                data-testid="photo-item"
                className={`overflow-hidden group relative ${
                  isEditMode ? 'cursor-pointer hover:ring-2 hover:ring-primary' : 'cursor-pointer'
                } ${isCurrentThumbnail && isEditMode ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  if (isEditMode) {
                    handleSetThumbnail(photoUri);
                  } else {
                    setLightboxIndex(i);
                  }
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUri} alt="Plant photo" className="w-full h-48 object-cover" />
                {isCurrentThumbnail && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold">
                    Plant Image
                  </div>
                )}
                {!isEditMode && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
                <div className="p-2 text-xs text-muted-foreground">
                  {new Date(photo.takenAt).toLocaleDateString()}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Local AI Identification */}
      <Card className="p-6 mt-8">
        <h2 className="text-2xl font-bold mb-4">Identify with AI</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Runs locally in your browser — no internet needed after first download.
        </p>
        <LocalPlantIdentifier
          imageUrl={plant.thumbnailUrl}
          onResult={async (label) => {
            await plantRepository.update({ ...plant, species: label });
            await loadPlantData();
          }}
        />
      </Card>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none"
            onClick={() => setLightboxIndex(null)}
          >
            ×
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white text-4xl"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              ‹
            </button>
          )}
          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-16 text-white text-4xl"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              ›
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[lightboxIndex]?.localUri || photos[lightboxIndex]?.remoteUrl}
            alt="Plant photo"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 text-white/70 text-sm">
            {photos[lightboxIndex]?.takenAt ? new Date(photos[lightboxIndex].takenAt).toLocaleDateString() : ''}
            {' '}({lightboxIndex + 1}/{photos.length})
          </p>
        </div>
      )}
    </div>
  );
}
