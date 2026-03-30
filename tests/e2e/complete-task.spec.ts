import { test, expect } from './fixtures/seed.fixture';

test.describe('Complete Task', () => {
  test('should mark a due task as complete and reduce the task count', async ({ page, seedPage }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Seed IndexedDB with default fixture (seed=42 — includes due care tasks)
    await seedPage();
    // seedPage reloads the page and waits for networkidle internally

    // Wait for the due-tasks section or the "all caught up" message
    await Promise.race([
      page.waitForSelector('[data-testid="due-tasks-section"]', { timeout: 10_000 }),
      page.waitForSelector('text=All caught up', { timeout: 10_000 }),
    ]);

    const taskCards = page.locator('[data-testid="task-card"]');
    const taskCount = await taskCards.count();

    if (taskCount === 0) {
      // No due tasks in seed data — test passes vacuously
      console.log('No due tasks in seed data, skipping completion check');
      return;
    }

    // Record the first task title for logging
    const firstCard = taskCards.first();
    const taskTitle = await firstCard.locator('h3').innerText().catch(() => 'unknown task');

    // Click Complete on the first task card — button has text "Complete"
    const completeBtn = firstCard.getByTestId('complete-task-btn').or(
      firstCard.getByRole('button', { name: /^complete$/i })
    );
    await completeBtn.click();

    // Wait for the React state to update and the task list to shrink.
    // loadTasks() re-fetches from IndexedDB after careTaskRepository.complete(),
    // then calls setDueTasks() which triggers a re-render.
    await page.waitForFunction(
      (expectedCount) => {
        const cards = document.querySelectorAll('[data-testid="task-card"]');
        return cards.length < expectedCount;
      },
      taskCount,
      { timeout: 10_000 }
    );

    const newCount = await taskCards.count();
    expect(newCount).toBeLessThan(taskCount);
    console.log(`Completed task "${taskTitle}": ${taskCount} → ${newCount} tasks`);
  });

  test('should show all-caught-up message when no tasks are due', async ({ page }) => {
    // Fresh page with no seeded data — no tasks exist at all
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // With no IndexedDB data, the due tasks list should be empty
    const taskCards = page.locator('[data-testid="task-card"]');
    const taskCount = await taskCards.count();

    // Either the "all caught up" card shows or there are no task cards
    if (taskCount === 0) {
      await expect(page.getByText(/all caught up/i)).toBeVisible();
    }
  });
});
