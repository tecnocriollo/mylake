import { test, expect } from '@playwright/test';

test.describe('Cell Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button:has-text("Login")');
    await page.waitForURL('/', { timeout: 10000 });
    
    // Navigate to notebooks
    await page.goto('/notebooks');
  });

  test('should execute a simple code cell', async ({ page }) => {
    // Create a new notebook first
    await page.click('button:has-text("+ New")');
    const notebookName = `exec-test-${Date.now()}`;
    await page.fill('input[placeholder*="notebook name"]', notebookName);
    await page.click('button:has-text("Create")');
    
    // Wait for notebook to open
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Clear the editor and type simple code
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print("Hello from Playwright!")');
    
    // Click run button
    await page.click('button[title="Run cell"]');
    
    // Wait for output
    await expect(page.locator('text=Hello from Playwright!')).toBeVisible({ timeout: 30000 });
  });

  test('should execute code and show error on failure', async ({ page }) => {
    // Create a new notebook
    await page.click('button:has-text("+ New")');
    const notebookName = `error-test-${Date.now()}`;
    await page.fill('input[placeholder*="notebook name"]', notebookName);
    await page.click('button:has-text("Create")');
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Type code with error
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('1/0');
    
    // Click run
    await page.click('button[title="Run cell"]');
    
    // Wait for error output
    await expect(page.locator('text=ZeroDivisionError')).toBeVisible({ timeout: 30000 });
  });

  test('should execute code with output on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Create notebook
    await page.click('button:has-text("+ New")');
    const notebookName = `mobile-test-${Date.now()}`;
    await page.fill('input[placeholder*="notebook name"]', notebookName);
    await page.click('button:has-text("Create")');
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 });
    
    // Execute simple math
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('2 + 2');
    
    await page.click('button[title="Run cell"]');
    
    // Should show output
    await expect(page.locator('text=4')).toBeVisible({ timeout: 30000 });
  });
});