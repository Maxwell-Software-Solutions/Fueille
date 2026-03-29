/**
 * @jest-environment jsdom
 */
import { NotificationScheduler } from './NotificationScheduler';
import type { CareTask } from '@/lib/domain/entities';

// Mock the domain module so careTaskRepository.list is controllable
jest.mock('@/lib/domain', () => ({
  careTaskRepository: { list: jest.fn() },
}));

// Mock DeepLinkService so we don't hit real navigation logic
jest.mock('./DeepLinkService', () => ({
  deepLinkService: {
    createDeepLink: jest.fn(() => '/plants/plant-1'),
    parseDeepLink: jest.fn(() => ({ type: 'plant', id: 'plant-1' })),
    navigate: jest.fn(),
  },
}));

// Pull in the mocked careTaskRepository after jest.mock is hoisted
import { careTaskRepository } from '@/lib/domain';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<CareTask> = {}): CareTask {
  return {
    id: 'task-1',
    plantId: 'plant-1',
    title: 'Water the plant',
    taskType: 'water',
    dueAt: new Date(Date.now() + 60_000), // 1 minute in the future
    completedAt: null,
    snoozedUntil: null,
    repeatInterval: null,
    repeatCustomDays: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown of window globals
// ---------------------------------------------------------------------------

let MockNotification: jest.Mock;

beforeEach(() => {
  // Reset timers and mocks
  jest.useFakeTimers();
  jest.clearAllMocks();

  // Set up a mock Notification constructor with static members
  MockNotification = jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    onclick: null,
  }));
  MockNotification.permission = 'default' as NotificationPermission;
  MockNotification.requestPermission = jest.fn().mockResolvedValue('granted');

  // Assign to global window
  Object.defineProperty(window, 'Notification', {
    value: MockNotification,
    writable: true,
    configurable: true,
  });

  // Ensure mobile bridge globals are absent by default (web path)
  delete (window as any).NativePlantBridge;
  delete (window as any).Capacitor;
});

afterEach(() => {
  jest.useRealTimers();
  // Clean up globals that tests may have set
  delete (window as any).NativePlantBridge;
  delete (window as any).Capacitor;
});

// ---------------------------------------------------------------------------
// constructor
// ---------------------------------------------------------------------------

describe('NotificationScheduler constructor', () => {
  it('reads Notification.permission on construction when Notification exists', () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    expect(scheduler.getPermission()).toBe('granted');
  });

  it('defaults to "default" permission when Notification is not in window', () => {
    // Remove Notification from window entirely
    const orig = (window as any).Notification;
    delete (window as any).Notification;

    const scheduler = new NotificationScheduler();
    expect(scheduler.getPermission()).toBe('default');

    // Restore
    (window as any).Notification = orig;
  });
});

// ---------------------------------------------------------------------------
// getPermission
// ---------------------------------------------------------------------------

describe('getPermission()', () => {
  it('returns the current permission state', () => {
    MockNotification.permission = 'denied';
    const scheduler = new NotificationScheduler();
    expect(scheduler.getPermission()).toBe('denied');
  });

  it('returns "default" before any permission request', () => {
    MockNotification.permission = 'default';
    const scheduler = new NotificationScheduler();
    expect(scheduler.getPermission()).toBe('default');
  });
});

// ---------------------------------------------------------------------------
// requestPermission — web path
// ---------------------------------------------------------------------------

describe('requestPermission() — web path', () => {
  it('returns true when permission is already granted', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();

    const result = await scheduler.requestPermission();

    expect(result).toBe(true);
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('returns true when Notification.requestPermission resolves to "granted"', async () => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission = jest.fn().mockResolvedValue('granted');
    const scheduler = new NotificationScheduler();

    const result = await scheduler.requestPermission();

    expect(result).toBe(true);
    expect(scheduler.getPermission()).toBe('granted');
  });

  it('returns false when Notification.requestPermission resolves to "denied"', async () => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission = jest.fn().mockResolvedValue('denied');
    const scheduler = new NotificationScheduler();

    const result = await scheduler.requestPermission();

    expect(result).toBe(false);
    expect(scheduler.getPermission()).toBe('denied');
  });

  it('returns false and logs a warning when Notification is not supported', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Remove Notification from window
    delete (window as any).Notification;

    const scheduler = new NotificationScheduler();
    const result = await scheduler.requestPermission();

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not supported'));
    warnSpy.mockRestore();

    // Restore so other tests still work
    (window as any).Notification = MockNotification;
  });
});

// ---------------------------------------------------------------------------
// requestPermission — mobile (Capacitor) path
// ---------------------------------------------------------------------------

describe('requestPermission() — mobile path', () => {
  it('returns true when NativePlantBridge.scheduleNotification resolves scheduled=true', async () => {
    (window as any).NativePlantBridge = {
      scheduleNotification: jest.fn().mockResolvedValue({ scheduled: true }),
    };
    (window as any).Capacitor = {};

    const scheduler = new NotificationScheduler();
    const result = await scheduler.requestPermission();

    expect(result).toBe(true);
    expect(scheduler.getPermission()).toBe('granted');
    expect((window as any).NativePlantBridge.scheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'permission-test' })
    );
    // Web Notification.requestPermission should NOT have been called
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('returns false when NativePlantBridge.scheduleNotification resolves scheduled=false', async () => {
    (window as any).NativePlantBridge = {
      scheduleNotification: jest.fn().mockResolvedValue({ scheduled: false }),
    };
    (window as any).Capacitor = {};

    const scheduler = new NotificationScheduler();
    const result = await scheduler.requestPermission();

    expect(result).toBe(false);
    expect(scheduler.getPermission()).toBe('denied');
  });

  it('returns false and logs an error when NativePlantBridge.scheduleNotification throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (window as any).NativePlantBridge = {
      scheduleNotification: jest.fn().mockRejectedValue(new Error('bridge error')),
    };
    (window as any).Capacitor = {};

    const scheduler = new NotificationScheduler();
    const result = await scheduler.requestPermission();

    expect(result).toBe(false);
    expect(scheduler.getPermission()).toBe('denied');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('mobile notification permission'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('falls through to web path when NativePlantBridge is set but Capacitor is absent', async () => {
    // Only NativePlantBridge without Capacitor → not treated as mobile
    (window as any).NativePlantBridge = {
      scheduleNotification: jest.fn().mockResolvedValue({ scheduled: true }),
    };
    delete (window as any).Capacitor;

    MockNotification.permission = 'default';
    MockNotification.requestPermission = jest.fn().mockResolvedValue('granted');
    const scheduler = new NotificationScheduler();

    const result = await scheduler.requestPermission();

    expect(result).toBe(true);
    expect(MockNotification.requestPermission).toHaveBeenCalled();
    expect((window as any).NativePlantBridge.scheduleNotification).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scheduleForTask
// ---------------------------------------------------------------------------

describe('scheduleForTask()', () => {
  it('returns false when task has no dueAt', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const task = makeTask({ dueAt: null });

    const result = await scheduler.scheduleForTask(task);

    expect(result).toBe(false);
  });

  it('returns false when task is already completed', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const task = makeTask({ completedAt: new Date() });

    const result = await scheduler.scheduleForTask(task);

    expect(result).toBe(false);
  });

  it('returns false when task is in the past', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const task = makeTask({ dueAt: new Date(Date.now() - 60_000) }); // 1 minute ago

    const result = await scheduler.scheduleForTask(task);

    expect(result).toBe(false);
  });

  it('returns false when permission cannot be obtained', async () => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission = jest.fn().mockResolvedValue('denied');
    const scheduler = new NotificationScheduler();
    const task = makeTask();

    const result = await scheduler.scheduleForTask(task);

    expect(result).toBe(false);
  });

  it('schedules a setTimeout and returns true for a future task (web path)', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    const task = makeTask({ dueAt: new Date(Date.now() + 60_000) });

    const result = await scheduler.scheduleForTask(task);

    expect(result).toBe(true);
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it('cancels an existing notification before rescheduling', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
    const task = makeTask({ dueAt: new Date(Date.now() + 60_000) });

    // Schedule once to register a timer
    await scheduler.scheduleForTask(task);
    // Schedule again — should cancel the first one
    await scheduler.scheduleForTask(task);

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('requests permission if not yet granted', async () => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission = jest.fn().mockResolvedValue('granted');
    const scheduler = new NotificationScheduler();
    const task = makeTask();

    await scheduler.scheduleForTask(task);

    expect(MockNotification.requestPermission).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scheduleForTask — mobile path
// ---------------------------------------------------------------------------

describe('scheduleForTask() — mobile path', () => {
  beforeEach(() => {
    (window as any).NativePlantBridge = {
      scheduleNotification: jest.fn().mockResolvedValue({ scheduled: true }),
    };
    (window as any).Capacitor = {};
  });

  it('calls NativePlantBridge.scheduleNotification with correct args', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const task = makeTask({ id: 'task-99', plantId: 'plant-42', taskType: 'fertilize' });

    const result = await scheduler.scheduleForTask(task);

    expect(result).toBe(true);
    expect((window as any).NativePlantBridge.scheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-99',
        title: '🌱 Plant Care Reminder',
        body: expect.stringContaining('fertilize'),
        at: expect.any(String),
        data: expect.objectContaining({ taskId: 'task-99', plantId: 'plant-42' }),
      })
    );
  });

  it('returns false and logs error when scheduleNotification throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    MockNotification.permission = 'granted';
    (window as any).NativePlantBridge = {
      scheduleNotification: jest.fn().mockRejectedValue(new Error('native error')),
    };

    const scheduler = new NotificationScheduler();
    const task = makeTask();

    const result = await scheduler.scheduleForTask(task);

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('mobile notification'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it('returns the scheduled value from NativePlantBridge (false case)', async () => {
    MockNotification.permission = 'granted';
    (window as any).NativePlantBridge = {
      scheduleNotification: jest.fn().mockResolvedValue({ scheduled: false }),
    };

    const scheduler = new NotificationScheduler();
    const result = await scheduler.scheduleForTask(makeTask());

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cancelForTask
// ---------------------------------------------------------------------------

describe('cancelForTask()', () => {
  it('clears the timeout and removes the task from the map', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
    const task = makeTask({ id: 'task-cancel' });

    await scheduler.scheduleForTask(task);
    scheduler.cancelForTask('task-cancel');

    expect(clearTimeoutSpy).toHaveBeenCalled();

    // After cancellation the task should not be cancelled again on clearAll
    clearTimeoutSpy.mockClear();
    scheduler.clearAll();
    // clearTimeout should not be called again for this task since it was removed
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('is a no-op when the task is not scheduled', () => {
    const scheduler = new NotificationScheduler();
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    // Should not throw and should not call clearTimeout
    expect(() => scheduler.cancelForTask('nonexistent-task')).not.toThrow();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe('clearAll()', () => {
  it('clears all scheduled notifications and empties the map', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    const task1 = makeTask({ id: 'task-a', dueAt: new Date(Date.now() + 10_000) });
    const task2 = makeTask({ id: 'task-b', dueAt: new Date(Date.now() + 20_000) });

    await scheduler.scheduleForTask(task1);
    await scheduler.scheduleForTask(task2);

    scheduler.clearAll();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    // After clearAll, scheduling again should not call clearTimeout on the old ones
    clearTimeoutSpy.mockClear();
    scheduler.clearAll();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('is a no-op when nothing is scheduled', () => {
    const scheduler = new NotificationScheduler();
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    expect(() => scheduler.clearAll()).not.toThrow();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scheduleAllUpcoming
// ---------------------------------------------------------------------------

describe('scheduleAllUpcoming()', () => {
  it('calls careTaskRepository.list with isCompleted: false', async () => {
    (careTaskRepository.list as jest.Mock).mockResolvedValue([]);
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();

    await scheduler.scheduleAllUpcoming();

    expect(careTaskRepository.list).toHaveBeenCalledWith({ isCompleted: false });
  });

  it('returns 0 when there are no tasks', async () => {
    (careTaskRepository.list as jest.Mock).mockResolvedValue([]);
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();

    const count = await scheduler.scheduleAllUpcoming();

    expect(count).toBe(0);
  });

  it('schedules only future tasks and returns count', async () => {
    const futureTask1 = makeTask({ id: 'future-1', dueAt: new Date(Date.now() + 30_000) });
    const futureTask2 = makeTask({ id: 'future-2', dueAt: new Date(Date.now() + 60_000) });
    const pastTask = makeTask({ id: 'past-1', dueAt: new Date(Date.now() - 30_000) });
    const noDateTask = makeTask({ id: 'nodate-1', dueAt: null });

    (careTaskRepository.list as jest.Mock).mockResolvedValue([
      futureTask1,
      futureTask2,
      pastTask,
      noDateTask,
    ]);
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();

    const count = await scheduler.scheduleAllUpcoming();

    // Only 2 future tasks should be scheduled
    expect(count).toBe(2);
  });

  it('skips tasks where dueAt is exactly now or in the past', async () => {
    const exactNow = makeTask({ id: 'now-1', dueAt: new Date(Date.now()) });
    (careTaskRepository.list as jest.Mock).mockResolvedValue([exactNow]);
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();

    const count = await scheduler.scheduleAllUpcoming();

    // new Date(task.dueAt) > now — strict greater-than, so exactly now is excluded
    expect(count).toBe(0);
  });

  it('returns 0 when all upcoming tasks fail to schedule', async () => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission = jest.fn().mockResolvedValue('denied');
    const futureTask = makeTask({ id: 'future-1', dueAt: new Date(Date.now() + 30_000) });
    (careTaskRepository.list as jest.Mock).mockResolvedValue([futureTask]);

    const scheduler = new NotificationScheduler();
    const count = await scheduler.scheduleAllUpcoming();

    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// showNotification (tested indirectly via setTimeout firing)
// ---------------------------------------------------------------------------

describe('showNotification() — invoked via timer', () => {
  it('creates a Notification when the setTimeout fires on the web path', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const task = makeTask({ dueAt: new Date(Date.now() + 5_000) });

    await scheduler.scheduleForTask(task);

    // Advance timers so the notification fires
    jest.runAllTimers();

    expect(MockNotification).toHaveBeenCalledWith(
      expect.stringContaining('Plant Care Reminder'),
      expect.objectContaining({
        body: expect.stringContaining('water'),
        tag: task.id,
      })
    );
  });

  it('removes the task from scheduledNotifications after the timer fires', async () => {
    MockNotification.permission = 'granted';
    const scheduler = new NotificationScheduler();
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');
    const task = makeTask({ id: 'fire-task', dueAt: new Date(Date.now() + 5_000) });

    await scheduler.scheduleForTask(task);
    jest.runAllTimers();

    // After firing, clearAll should not call clearTimeout (map is empty)
    clearTimeoutSpy.mockClear();
    scheduler.clearAll();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('calls NativePlantBridge.scheduleNotification inside showNotification when bridge is set', async () => {
    // Set up bridge so the setTimeout fires the mobile path inside showNotification
    const bridgeMock = {
      scheduleNotification: jest.fn().mockResolvedValue({ scheduled: true }),
    };
    (window as any).NativePlantBridge = bridgeMock;
    (window as any).Capacitor = {};

    MockNotification.permission = 'granted';
    // scheduleForTask with mobile bridge active will use the Capacitor path — NOT setTimeout.
    // To reach showNotification's mobile branch we need a scheduler that has permission
    // but scheduleForTask uses mobile path. We test showNotification via web scheduler
    // but with NativePlantBridge added AFTER scheduling so the timer fires the bridge path.

    // Remove Capacitor during scheduling so web setTimeout path is taken
    delete (window as any).Capacitor;
    const scheduler = new NotificationScheduler();
    const task = makeTask({ id: 'show-mobile', dueAt: new Date(Date.now() + 5_000) });

    // scheduleForTask will use web setTimeout (no Capacitor)
    await scheduler.scheduleForTask(task);

    // Now add NativePlantBridge.scheduleNotification before timer fires
    (window as any).NativePlantBridge = bridgeMock;

    jest.runAllTimers();

    // showNotification should have called the bridge
    expect(bridgeMock.scheduleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'show-mobile',
        title: '🌱 Plant Care Reminder',
      })
    );
    // Web Notification constructor should NOT have been called
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('invokes onclick handler on the Notification instance', async () => {
    MockNotification.permission = 'granted';
    const mockNotifInstance = {
      close: jest.fn(),
      onclick: null as any,
    };
    MockNotification.mockImplementation(() => mockNotifInstance);

    const { deepLinkService: mockDeepLink } = jest.requireMock('./DeepLinkService');
    mockDeepLink.parseDeepLink.mockReturnValue({ type: 'plant', id: 'plant-1' });

    const scheduler = new NotificationScheduler();
    const task = makeTask({ plantId: 'plant-1', dueAt: new Date(Date.now() + 5_000) });

    await scheduler.scheduleForTask(task);
    jest.runAllTimers();

    // Trigger the onclick that showNotification assigned
    expect(mockNotifInstance.onclick).not.toBeNull();
    mockNotifInstance.onclick();

    expect(mockDeepLink.parseDeepLink).toHaveBeenCalledWith('/plants/plant-1');
    expect(mockDeepLink.navigate).toHaveBeenCalledWith({ type: 'plant', id: 'plant-1' });
    expect(mockNotifInstance.close).toHaveBeenCalled();
  });

  it('onclick does not call navigate when parseDeepLink returns null', async () => {
    MockNotification.permission = 'granted';
    const mockNotifInstance = {
      close: jest.fn(),
      onclick: null as any,
    };
    MockNotification.mockImplementation(() => mockNotifInstance);

    const { deepLinkService: mockDeepLink } = jest.requireMock('./DeepLinkService');
    mockDeepLink.parseDeepLink.mockReturnValue(null);

    const scheduler = new NotificationScheduler();
    const task = makeTask({ dueAt: new Date(Date.now() + 5_000) });

    await scheduler.scheduleForTask(task);
    jest.runAllTimers();

    mockNotifInstance.onclick();

    expect(mockDeepLink.navigate).not.toHaveBeenCalled();
    expect(mockNotifInstance.close).toHaveBeenCalled();
  });

  it('catches and logs error when Notification constructor throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    MockNotification.permission = 'granted';
    MockNotification.mockImplementation(() => {
      throw new Error('constructor error');
    });

    const scheduler = new NotificationScheduler();
    const task = makeTask({ dueAt: new Date(Date.now() + 5_000) });

    await scheduler.scheduleForTask(task);
    // Should not throw when timer fires
    expect(() => jest.runAllTimers()).not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to show notification'),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});
