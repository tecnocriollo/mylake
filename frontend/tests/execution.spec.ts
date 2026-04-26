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
    await page.goto('/notebooks');
    await page.click('button:has-text("+ New")');
    await expect(page.locator('text=New Notebook')).toBeVisible();
    await page.fill('input[value=""]', name);
    await page.click('button:has-text("Create")');
    
    // Wait for notebook editor to load
    // CodeMirror carga rápido, esperamos el contenedor del editor
    await page.waitForSelector('.cm-editor', { timeout: 15000 });
    // Esperar a que el editor esté interactuable
    await page.waitForTimeout(1000);
  }

  test('should execute a simple code cell', async ({ page }) => {
    await createAndOpenNotebook(page, `exec-test-${Date.now()}`);
    
    // Interactuar con CodeMirror
    const editor = page.locator('.cm-editor').first();
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
    
    const editor = page.locator('.cm-editor').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print(42)');
    
    await page.click('button:has-text("Run")');
    await expect(page.locator('text=42')).toBeVisible({ timeout: 20000 });
  });

  test('should show math operation result', async ({ page }) => {
    await createAndOpenNotebook(page, `math-test-${Date.now()}`);
    
    const editor = page.locator('.cm-editor').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('2 + 2');
    
    await page.click('button:has-text("Run")');
    await expect(page.locator('text=4')).toBeVisible({ timeout: 20000 });
  });

  test('should show error on invalid code', async ({ page }) => {
    await createAndOpenNotebook(page, `error-test-${Date.now()}`);
    
    const editor = page.locator('.cm-editor').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('1/0');
    
    await page.click('button:has-text("Run")');
    
    // Verificar que aparece algún error
    const errorOutput = page.locator('text=ZeroDivisionError, error, Error, or exception');
    await expect(errorOutput).toBeVisible({ timeout: 20000 });
  });

  test('should execute code on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await createAndOpenNotebook(page, `mobile-exec-${Date.now()}`);
    
    const editor = page.locator('.cm-editor').first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print("mobile")');
    
    await page.click('button:has-text("Run")');
    await expect(page.locator('text=mobile')).toBeVisible({ timeout: 20000 });
  });
});