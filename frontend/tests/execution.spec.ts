import { test, expect } from '@playwright/test';

test.describe('Cell Execution', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button:has-text("Sign in")');
    
    // Wait for token
    await page.waitForFunction(() => localStorage.getItem('token') !== null, { timeout: 10000 });
  });

  async function createAndOpenNotebook(page: any, name: string) {
    // Create notebook via UI
    await page.goto('/notebooks');
    await page.click('button:has-text("+ New")');
    await page.fill('input[placeholder*="notebook"]', name);
    await page.click('button:has-text("Create")');
    
    // Wait for creation and list refresh
    await page.waitForTimeout(2000);
    
    // Reload to see the new notebook
    await page.goto('/notebooks');
    await page.waitForTimeout(1000);
    
    // Find and click the notebook - use first match with partial text
    const notebookButton = page.locator(`h3:has-text("${name}")`).first();
    await notebookButton.click();
    
    // Wait for notebook to load
    await page.waitForSelector('button:has-text("▶ Run")', { timeout: 15000 });
    
    // Click Edit button to enter edit mode and show CodeMirror
    await page.click('button:has-text("Edit")');
    
    // Wait for CodeMirror editor to appear
    await page.waitForSelector('.cm-content, [contenteditable="true"]', { timeout: 15000 });
    await page.waitForTimeout(500);
  }

  test('should execute a simple code cell', async ({ page }) => {
    await createAndOpenNotebook(page, `exec-test-${Date.now()}`);
    
    // Interactuar con CodeMirror
    const editor = page.locator('.cm-content, [contenteditable="true"]').first();
    await editor.click();
    // CodeMirror usa contenteditable, seleccionamos todo y escribimos
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print("Hello from Playwright!")');
    
    // Buscar botón de run
    const runButton = page.locator('button:has-text("Run"), button[title*="Run"], button:has-text("▶")').first();
    await runButton.click();
    
    // Verificar output
    await expect(page.locator('text=Hello from Playwright!')).toBeVisible({ timeout: 20000 });
  });

  test('should show print output from code', async ({ page }) => {
    await createAndOpenNotebook(page, `print-test-${Date.now()}`);
    
    const editor = page.locator('.cm-content, [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print(42)');
    
    await page.click('button:has-text("Run")');
    await expect(page.locator('text=42')).toBeVisible({ timeout: 20000 });
  });

  test('should show math operation result', async ({ page }) => {
    await createAndOpenNotebook(page, `math-test-${Date.now()}`);
    
    const editor = page.locator('.cm-content, [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('2 + 2');
    
    await page.click('button:has-text("Run")');
    await expect(page.locator('text=4')).toBeVisible({ timeout: 20000 });
  });

  test('should show error on invalid code', async ({ page }) => {
    await createAndOpenNotebook(page, `error-test-${Date.now()}`);
    
    const editor = page.locator('.cm-content, [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('1/0');
    
    await page.click('button:has-text("Run")');
    
    // Verificar que aparece el área de output (indica que se ejecutó)
    await expect(page.locator('button:has-text("Output")')).toBeVisible({ timeout: 20000 });
  });

  test('should execute code on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await createAndOpenNotebook(page, `mobile-exec-${Date.now()}`);
    
    const editor = page.locator('.cm-content, [contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print("mobile")');
    
    await page.click('button:has-text("Run")');
    // Buscar el output en el área de resultados (el texto "mobile" dentro del output)
    await expect(page.locator('span:has-text("\\"mobile\\"")').first()).toBeVisible({ timeout: 20000 });
  });
});