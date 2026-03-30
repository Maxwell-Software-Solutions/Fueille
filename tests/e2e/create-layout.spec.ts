import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Create Layout', () => {
  test('should create a new layout and navigate to its detail page', async ({ page }) => {
    await page.goto('/layouts/new');
    await page.waitForLoadState('networkidle');

    // The page first shows a "Take Photo" button — no form is visible yet
    const takePhotoBtn = page.getByRole('button', { name: /take photo/i });
    await expect(takePhotoBtn).toBeVisible();

    // Clicking "Take Photo" renders the PhotoCapture component (full page swap).
    await takePhotoBtn.click();

    // Wait for the "Choose File" button to appear — this confirms PhotoCapture is mounted.
    const chooseFileBtn = page.getByRole('button', { name: /choose file/i });
    await chooseFileBtn.waitFor({ state: 'visible', timeout: 5_000 });

    // PhotoCapture renders two visible buttons: "Take Photo" and "Choose File".
    // Clicking "Choose File" triggers fileInputRef.current?.click() on the hidden
    // file-picker input.  We intercept the resulting file-chooser dialog using
    // page.waitForEvent('filechooser') so we can inject our test image programmatically.
    const testImagePath = path.join(process.cwd(), 'tests', 'e2e', 'fixtures', 'test-image.png');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await chooseFileBtn.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // PhotoCapture compresses the image via canvas then calls onPhotoCapture.
    // onPhotoCapture sets imageUri on the parent and hides PhotoCapture.
    // Wait for the form to appear — identified by the "Create Layout" submit button.
    // Use a simple role selector (no or()) so waitFor is unambiguous.
    const submitBtn = page.getByRole('button', { name: 'Create Layout' });
    await submitBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // Fill in the layout name
    const nameInput = page.getByTestId('layout-name-input').or(
      page.locator('input[placeholder*="Backyard"]').or(page.locator('input[placeholder*="Garden"]'))
    ).first();
    await nameInput.fill('Test Garden');

    await submitBtn.click();

    // Successful creation redirects to the new layout's detail page  (/layouts/<id>)
    await page.waitForURL('**/layouts/**', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // Verify the layout name is shown on the detail page
    await expect(page.getByText('Test Garden')).toBeVisible();
  });

  test('should keep the form hidden until a photo is provided', async ({ page }) => {
    await page.goto('/layouts/new');
    await page.waitForLoadState('networkidle');

    // Before photo is captured the form is not visible — only "Take Photo" shows
    const takePhotoBtn = page.getByRole('button', { name: /take photo/i });
    await expect(takePhotoBtn).toBeVisible();

    // The Create Layout submit button must not exist at all at this point
    const submitBtn = page.getByRole('button', { name: 'Create Layout' });
    await expect(submitBtn).toHaveCount(0);
  });
});
