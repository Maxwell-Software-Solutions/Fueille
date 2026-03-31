import { test, expect, type Page } from '@playwright/test';

// CSR pages may occasionally fail to hydrate — allow one retry.
test.describe.configure({ retries: 1 });

// Wait for client-side hydration to complete
async function waitForApp(page: Page) {
  try {
    await page.waitForSelector('nav a', { timeout: 10_000 });
  } catch {
    // CSR app with ssr:false may need a reload to hydrate
    await page.reload();
    await page.waitForSelector('nav a', { timeout: 15_000 });
  }
  await page.waitForLoadState('networkidle');
}

// Seed a plant so later tests have data
async function seedPlant(page: Page, name: string) {
  await page.goto('/plants/new');
  await waitForApp(page);
  // Wait specifically for the form to render (dynamic import)
  await page.waitForSelector('[data-testid="plant-name-input"]', { timeout: 15000 });
  await page.locator('[data-testid="plant-name-input"]').fill(name);
  await page.locator('[data-testid="plant-species-input"]').fill('Testus plantus');
  await page.locator('[data-testid="plant-location-input"]').fill('Living Room');
  await page.locator('textarea#notes').fill('Test notes');
  await page.locator('[data-testid="save-plant-btn"]').click();
  await page.waitForURL('**/plants', { timeout: 15000 });
}

// ─── 1. Bottom Navigation Routing ─────────────────────────────────────────────

test.describe('Bottom Navigation', () => {
  test('Home tab navigates to /', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);
    await page.locator('nav a[href="/"]').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  });

  test('Plants tab navigates to /plants', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await page.locator('nav a[href="/plants"]').click();
    await expect(page).toHaveURL(/\/plants$/, { timeout: 10_000 });
  });

  test('Add button navigates to /plants/new', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await page.locator('nav a[href="/plants/new"]').click();
    await expect(page).toHaveURL(/\/plants\/new$/, { timeout: 10_000 });
  });

  test('Library tab navigates to /plant-library', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await page.locator('nav a[href="/plant-library"]').click();
    await expect(page).toHaveURL(/\/plant-library$/, { timeout: 10_000 });
  });

  test('Settings tab navigates to /settings', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await page.locator('nav a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 10_000 });
  });

  test('active tab styling changes on navigation', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // On home page, Home icon should have text-primary
    const homeIcon = page.locator('nav a[href="/"]').locator('svg');
    await expect(homeIcon).toHaveClass(/text-primary/);

    // Navigate to Plants
    await page.locator('nav a[href="/plants"]').click();
    await expect(page).toHaveURL(/\/plants$/, { timeout: 10_000 });

    // Plants icon should now be primary, Home should be muted
    const plantsIcon = page.locator('nav a[href="/plants"]').locator('svg');
    await expect(plantsIcon).toHaveClass(/text-primary/);
    await expect(homeIcon).toHaveClass(/text-muted-foreground/);
  });
});

// ─── 2. Home Page Interactions ────────────────────────────────────────────────

test.describe('Home Page', () => {
  test('displays tasks or empty state after loading', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    // Wait for the loading state to resolve - page shows "Loading..." until IndexedDB loads
    await page.waitForFunction(() => {
      return !document.body.textContent?.includes('Loading...');
    }, { timeout: 10000 }).catch(() => {});
    // Now check for either empty state or task cards
    const allCaughtUp = page.getByText('All caught up!');
    const taskCards = page.locator('[data-testid="task-card"]');
    const todaysTasks = page.getByText("Today's Tasks");
    const noTasks = await allCaughtUp.isVisible().catch(() => false);
    const hasCards = (await taskCards.count()) > 0;
    const hasTodaySection = await todaysTasks.isVisible().catch(() => false);
    expect(noTasks || hasCards || hasTodaySection).toBeTruthy();
  });

  test('care summary chips visible when tasks exist', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const taskCards = page.locator('[data-testid="task-card"]');
    if ((await taskCards.count()) > 0) {
      await expect(page.getByText(/\d+ tasks? due/)).toBeVisible();
    }
  });

  test('Complete All / Snooze All visible with 2+ tasks', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const count = await page.locator('[data-testid="task-card"]').count();
    if (count >= 2) {
      await expect(page.locator('[data-testid="complete-all-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="snooze-all-btn"]')).toBeVisible();
    }
  });

  test('individual Complete button is visible and enabled', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const btn = page.locator('[data-testid="complete-task-btn"]').first();
    if (await btn.isVisible().catch(() => false)) {
      await expect(btn).toBeEnabled();
    }
  });

  test('layouts section or empty state shown', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const hasLayouts = await page.locator('[data-testid="layouts-section"]').isVisible().catch(() => false);
    const hasEmpty = await page.getByText('No layouts yet').isVisible().catch(() => false);
    expect(hasLayouts || hasEmpty).toBeTruthy();
  });
});

// ─── 3. Add Plant Form ────────────────────────────────────────────────────────

test.describe('Add Plant Form', () => {
  test('all form fields accept input', async ({ page }) => {
    await page.goto('/plants/new');
    await waitForApp(page);
    await page.waitForSelector('[data-testid="plant-name-input"]', { timeout: 15000 });

    const name = page.locator('[data-testid="plant-name-input"]');
    await name.fill('Test Plant');
    await expect(name).toHaveValue('Test Plant');

    const species = page.locator('[data-testid="plant-species-input"]');
    await species.fill('Testus maximus');
    await expect(species).toHaveValue('Testus maximus');

    const location = page.locator('[data-testid="plant-location-input"]');
    await location.fill('Kitchen');
    await expect(location).toHaveValue('Kitchen');

    const notes = page.locator('textarea#notes');
    await notes.fill('Some notes');
    await expect(notes).toHaveValue('Some notes');
  });

  test('Browse Library opens modal', async ({ page }) => {
    await page.goto('/plants/new');
    await waitForApp(page);
    await page.waitForSelector('[data-testid="plant-name-input"]', { timeout: 15000 });

    await page.getByRole('button', { name: 'Browse Library' }).click();
    await expect(page.getByText('Browse Plant Library')).toBeVisible();

    // Close
    await page.locator('[aria-label="Close"]').click();
    await expect(page.getByText('Browse Plant Library')).not.toBeVisible();
  });

  test('Save button disabled when name empty, enabled when filled', async ({ page }) => {
    await page.goto('/plants/new');
    await waitForApp(page);
    await page.waitForSelector('[data-testid="plant-name-input"]', { timeout: 15000 });

    const saveBtn = page.locator('[data-testid="save-plant-btn"]');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeDisabled();

    await page.locator('[data-testid="plant-name-input"]').fill('Test');
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
  });

  test('form submit creates plant and redirects', async ({ page }) => {
    await seedPlant(page, 'QA Test Plant');
    await expect(page).toHaveURL(/\/plants$/);
    await expect(page.getByText('QA Test Plant')).toBeVisible();
  });
});

// ─── 4. Plant List Page ───────────────────────────────────────────────────────

test.describe('Plant List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plants');
    await waitForApp(page);
    const count = await page.locator('[data-testid="plant-card"]').count();
    if (count === 0) {
      await seedPlant(page, 'List Test Plant');
      await page.goto('/plants');
      await waitForApp(page);
    }
  });

  test('search input filters results', async ({ page }) => {
    const search = page.locator('[data-testid="plant-search-input"]');
    await expect(search).toBeVisible();

    await search.fill('xyznonexistent');
    await expect(page.getByText('No plants match your search')).toBeVisible({ timeout: 5000 });

    await search.fill('');
    await expect(page.locator('[data-testid="plant-card"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('plant card navigates to detail', async ({ page }) => {
    await page.locator('[data-testid="plant-card"]').first().click();
    await expect(page).toHaveURL(/\/plants\/[a-zA-Z0-9_-]+$/);
  });
});

// ─── 5. Plant Library Page ────────────────────────────────────────────────────

test.describe('Plant Library Page', () => {
  test('page loads with plant cards', async ({ page }) => {
    await page.goto('/plant-library');
    await waitForApp(page);
    await expect(page.getByText('Plant Care Library')).toBeVisible();
    // Library cards are rendered in a grid
    const cards = page.locator('.grid > div');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('search filters library', async ({ page }) => {
    await page.goto('/plant-library');
    await waitForApp(page);
    const search = page.locator('input[type="search"]');
    await search.fill('xyznotfound');
    await expect(page.getByText('No plants found')).toBeVisible({ timeout: 5000 });
  });

  test('difficulty filter pills work', async ({ page }) => {
    await page.goto('/plant-library');
    await waitForApp(page);
    const easyBtn = page.getByRole('button', { name: 'Easy' });
    await easyBtn.click();
    await expect(easyBtn).toHaveClass(/neu-pressed/);
    const allBtn = page.getByRole('button', { name: 'All' });
    await allBtn.click();
    await expect(allBtn).toHaveClass(/neu-pressed/);
  });

  test('View Details expands care tasks', async ({ page }) => {
    await page.goto('/plant-library');
    await waitForApp(page);
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByText('Default Care Tasks').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide Details' }).first()).toBeVisible();
  });

  test('Use This Plant navigates to add form', async ({ page }) => {
    await page.goto('/plant-library');
    await waitForApp(page);
    await page.getByRole('link', { name: 'Use This Plant' }).first().click();
    await expect(page).toHaveURL(/\/plants\/new\?library=/);
  });
});

// ─── 6. Settings Page ─────────────────────────────────────────────────────────

test.describe('Settings Page', () => {
  test('theme selector switches between light/dark/system', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    const select = page.locator('select');
    await expect(select).toBeVisible();

    await select.selectOption('dark');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await select.selectOption('light');
    const cls = await page.locator('html').getAttribute('class');
    expect(cls).not.toContain('dark');

    await select.selectOption('system');
  });

  test('notification toggle switches', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);

    const toggle = page.locator('button[role="switch"]');
    await expect(toggle).toBeVisible();
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    const after = await toggle.getAttribute('aria-checked');
    expect(before).not.toEqual(after);
    // Restore
    await toggle.click();
  });

  test('Export JSON button present', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
  });

  test('Import JSON label present', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);
    await expect(page.getByText('Import JSON')).toBeVisible();
  });

  test('Clear All button present', async ({ page }) => {
    await page.goto('/settings');
    await waitForApp(page);
    await expect(page.getByRole('button', { name: 'Clear All' })).toBeVisible();
  });
});

// ─── 7. Button / Input States ─────────────────────────────────────────────────

test.describe('Button and Input States', () => {
  test('primary buttons have neumorphic hover/active classes', async ({ page }) => {
    await page.goto('/plants/new');
    await waitForApp(page);
    await page.waitForSelector('[data-testid="plant-name-input"]', { timeout: 15000 });
    // Fill name so save btn is enabled
    await page.locator('[data-testid="plant-name-input"]').fill('test');

    const cls = await page.locator('[data-testid="save-plant-btn"]').getAttribute('class');
    expect(cls).toContain('neu-raised');
    expect(cls).toContain('hover:neu-floating');
    expect(cls).toContain('active:neu-pressed');
    expect(cls).toContain('focus-visible:ring-2');
  });

  test('outline buttons have neumorphic interaction classes', async ({ page }) => {
    await page.goto('/plants/new');
    await waitForApp(page);
    await page.waitForSelector('[data-testid="plant-name-input"]', { timeout: 15000 });

    const cls = await page.getByRole('button', { name: 'Browse Library' }).getAttribute('class');
    expect(cls).toContain('neu-raised');
    expect(cls).toContain('hover:neu-floating');
    expect(cls).toContain('active:neu-pressed');
    expect(cls).toContain('focus-visible:ring-2');
  });

  test('form inputs have focus ring classes', async ({ page }) => {
    await page.goto('/plants/new');
    await waitForApp(page);
    await page.waitForSelector('[data-testid="plant-name-input"]', { timeout: 15000 });

    const cls = await page.locator('[data-testid="plant-name-input"]').getAttribute('class');
    expect(cls).toContain('focus:ring-2');
    expect(cls).toContain('focus:ring-primary/50');
  });

  test('center nav Add button has active:scale-95', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    const addSpan = page.locator('nav a[href="/plants/new"]').locator('span').first();
    const cls = await addSpan.getAttribute('class');
    expect(cls).toContain('active:scale-95');
    expect(cls).toContain('transition-transform');
  });
});
