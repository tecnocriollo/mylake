import { test, expect } from '@playwright/test';

test.describe('Notebook Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should navigate to notebooks page', async ({ page }) => {
    await page.goto('/notebooks');
    await expect(page.locator('text=📱 Mobile Notebooks')).toBeVisible();
  });

  test('should create a new notebook', async ({ page }) => {
    await page.goto('/notebooks');
    
    // Click + New button
    await page.click('button:has-text("+ New")');
    
    // Wait for modal
    await expect(page.locator('text=New Notebook')).toBeVisible();
    
    const notebookName = `test-${Date.now()}`;
    await page.fill('input[value=""]', notebookName);
    await page.click('button:has-text("Create")');
    
    // Should show success message
    await expect(page.locator('text=Notebook created!')).toBeVisible();
  });

  test('should open an existing notebook', async ({ page }) => {
    await page.goto('/notebooks');
    
    // First create a notebook
    await page.click('button:has-text("+ New")');
    await expect(page.locator('text=New Notebook')).toBeVisible();
    
    const notebookName = `open-test-${Date.now()}`;
    await page.fill('input[value=""]', notebookName);
    await page.click('button:has-text("Create")');
    
    // Wait for success message
    await expect(page.locator('text=Notebook created!')).toBeVisible();
    
    // Go back to notebooks list
    await page.goto('/notebooks');
    await page.waitForTimeout(1000);
    
    // Now find and click the notebook we just created
    const notebook = page.locator(`h3:has-text("${notebookName}")`);
    await expect(notebook).toBeVisible({ timeout: 5000 });
    await notebook.click();
    
    // Should show editor - look for the save button which indicates we're in editor mode
    await expect(page.locator('button:has-text("💾 Save")')).toBeVisible({ timeout: 10000 });
  });
});