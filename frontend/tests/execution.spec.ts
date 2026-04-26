import { test, expect } from '@playwright/test';

test.describe('Cell Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should execute a simple code cell', async ({ page }) => {
    // Go to notebooks
    await page.goto('/notebooks');
    
    // Create a new notebook
    await page.click('button:has-text("+ New")');
    await expect(page.locator('text=New Notebook')).toBeVisible();
    
    const notebookName = `exec-test-${Date.now()}`;
    await page.fill('input[value=""]', notebookName);
    await page.click('button:has-text("Create")');
    
    // Wait for notebook to load
    await page.waitForTimeout(3000);
    
    // Look for editor and type code
    const editor = page.locator('.monaco-editor, div[role="textbox"], textarea').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print("Hello from Playwright!")');
    
    // Click run button
    const runButton = page.locator('button:has-text("Run"), button[title*="Run"]').first();
    await expect(runButton).toBeVisible();
    await runButton.click();
    
    // Wait for execution and check for actual output
    await expect(page.locator('text=Hello from Playwright!')).toBeVisible({ timeout: 15000 });
  });

  test('should show print output from code', async ({ page }) => {
    await page.goto('/notebooks');
    
    // Create notebook
    await page.click('button:has-text("+ New")');
    await expect(page.locator('text=New Notebook')).toBeVisible();
    
    await page.fill('input[value=""]', `print-output-${Date.now()}`);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(3000);
    
    // Type code
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print(42)');
    
    // Run
    await page.click('button:has-text("Run")');
    
    // Verify actual output shows 42
    await expect(page.locator('text=42')).toBeVisible({ timeout: 15000 });
  });

  test('should show math operation result', async ({ page }) => {
    await page.goto('/notebooks');
    
    await page.click('button:has-text("+ New")');
    await expect(page.locator('text=New Notebook')).toBeVisible();
    
    await page.fill('input[value=""]', `math-test-${Date.now()}`);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(3000);
    
    // Type math expression
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('2 + 2');
    
    // Run
    await page.click('button:has-text("Run")');
    
    // Verify output shows 4
    await expect(page.locator('text=4')).toBeVisible({ timeout: 15000 });
  });

  test('should show error on invalid code', async ({ page }) => {
    await page.goto('/notebooks');
    
    await page.click('button:has-text("+ New")');
    await expect(page.locator('text=New Notebook')).toBeVisible();
    
    await page.fill('input[value=""]', `error-test-${Date.now()}`);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(3000);
    
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('1/0');
    
    await page.click('button:has-text("Run")');
    
    // Should show ZeroDivisionError
    await expect(page.locator('text=ZeroDivisionError, error, or Error')).toBeVisible({ timeout: 15000 });
  });

  test('should execute code with output on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/notebooks');
    
    await page.click('button:has-text("+ New")');
    await page.fill('input[value=""]', `mobile-exec-${Date.now()}`);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(3000);
    
    const editor = page.locator('.monaco-editor').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print("mobile")');
    
    await page.click('button:has-text("Run")');
    
    // Output visible on mobile
    await expect(page.locator('text=mobile')).toBeVisible({ timeout: 15000 });
  });
});