import { test, expect } from '@playwright/test';

test.describe('Add Plant', () => {
  test('should create a new plant and show it in the plant list', async ({ page }) => {
    await page.goto('/plants/new');
    await page.waitForLoadState('networkidle');

    // Fill the form — inputs identified by their id attributes
    const nameInput = page.getByTestId('plant-name-input').or(page.locator('input#name'));
    await nameInput.fill('Test Monstera');

    const speciesInput = page.getByTestId('plant-species-input').or(page.locator('input#species'));
    await speciesInput.fill('Monstera deliciosa');

    const locationInput = page.getByTestId('plant-location-input').or(page.locator('input#location'));
    await locationInput.fill('Living Room');

    // Submit — button is enabled once name is non-empty
    const saveBtn = page.getByTestId('save-plant-btn').or(page.getByRole('button', { name: /save plant/i }));
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Should redirect to /plants list
    await page.waitForURL('**/plants', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // Verify newly created plant appears in the list
    await expect(page.getByText('Test Monstera')).toBeVisible();
  });

  test('should not submit with empty name', async ({ page }) => {
    await page.goto('/plants/new');
    await page.waitForLoadState('networkidle');

    // Save button is disabled until name is filled
    const saveBtn = page.getByTestId('save-plant-btn').or(page.getByRole('button', { name: /save plant/i }));
    await expect(saveBtn).toBeDisabled();
  });

  test('should not submit after clearing name back to empty', async ({ page }) => {
    await page.goto('/plants/new');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByTestId('plant-name-input').or(page.locator('input#name'));
    const saveBtn = page.getByTestId('save-plant-btn').or(page.getByRole('button', { name: /save plant/i }));

    // Fill then clear the name
    await nameInput.fill('Temporary');
    await expect(saveBtn).toBeEnabled();

    await nameInput.fill('');
    await expect(saveBtn).toBeDisabled();
  });
});
