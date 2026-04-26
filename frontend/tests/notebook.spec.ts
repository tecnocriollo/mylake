import { test, expect } from '@playwright/test';

test.describe('Notebook Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should navigate to notebooks page', async ({ page }) => {
    await page.click('text=Mobile NB');
    await expect(page).toHaveURL('/notebooks');
    await expect(page.locator('text=Mobile Notebooks')).toBeVisible();
  });

  test('should create a new notebook', async ({ page }) => {
    await page.goto('/notebooks');
    
    await page.click('button:has-text("+ New")');
    
    const notebookName = `test-${Date.now()}`;
    await page.fill('input[placeholder*="notebook name"]', notebookName);
    await page.click('button:has-text("Create")');
    
    // Should show success message
    await expect(page.locator('text=Notebook created!')).toBeVisible();
    
    // Should appear in list
    await expect(page.locator(`text=${notebookName}.ipynb`)).toBeVisible();
  });

  test('should open an existing notebook', async ({ page }) => {
    await page.goto('/notebooks');
    
    // Click on first notebook
    await page.click('.notebook-item:first-child');
    
    // Should show notebook editor
    await expect(page.locator('.monaco-editor')).toBeVisible();
  });
});