import { careTaskRepository, type CareTask } from '@/lib/domain';

/**
 * Service for scheduling browser notifications for care tasks
 * Uses Web Notifications API with permission handling
 */
export class NotificationScheduler {
  private permission: NotificationPermission = 'default';
  private scheduledNotifications: Map<string, number> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  /**
   * Schedule notification for a care task
   */
  async scheduleForTask(task: CareTask): Promise<boolean> {
    if (!task.dueAt || task.completedAt) {
      return false;
    }

    // Request permission if not already granted
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return false;
      }
    }

    const dueDate = new Date(task.dueAt);
    const now = new Date();
    const timeUntilDue = dueDate.getTime() - now.getTime();

    // Cancel existing notification for this task
    this.cancelForTask(task.id);

    // Don't schedule if task is overdue
    if (timeUntilDue < 0) {
      return false;
    }

    // Schedule notification
    const timeoutId = window.setTimeout(() => {
      this.showNotification(task);
      this.scheduledNotifications.delete(task.id);
    }, timeUntilDue);

    this.scheduledNotifications.set(task.id, timeoutId);
    return true;
  }

  /**
   * Cancel scheduled notification for a task
   */
  cancelForTask(taskId: string): void {
    const timeoutId = this.scheduledNotifications.get(taskId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      this.scheduledNotifications.delete(taskId);
    }
  }

  /**
   * Show browser notification
   */
  private showNotification(task: CareTask): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      const notification = new Notification(`🌱 Plant Care Reminder`, {
        body: `Time to ${task.taskType}: ${task.title}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: task.id, // Prevents duplicate notifications
        requireInteraction: true, // Keeps notification visible until user acts
      });

      // Auto-close after 10 seconds if not interacted with
      setTimeout(() => notification.close(), 10000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        // Navigate to task's plant page
        if (task.plantId) {
          window.location.href = `/plants/${task.plantId}`;
        }
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Schedule notifications for all upcoming due tasks
   */
  async scheduleAllUpcoming(): Promise<number> {
    const tasks = await careTaskRepository.list({ isCompleted: false });
    const now = new Date();

    let scheduled = 0;
    for (const task of tasks) {
      if (task.dueAt && new Date(task.dueAt) > now) {
        const success = await this.scheduleForTask(task);
        if (success) scheduled++;
      }
    }

    return scheduled;
  }

  /**
   * Clear all scheduled notifications
   */
  clearAll(): void {
    for (const timeoutId of this.scheduledNotifications.values()) {
      window.clearTimeout(timeoutId);
    }
    this.scheduledNotifications.clear();
  }

  /**
   * Get permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();
